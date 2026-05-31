-- =============================================================================
-- CAP Games — Quizz mode "questions" (en plus du mode "buzzer" existant)
-- ⚠️ Idempotente : peut être ré-exécutée. Préserve les données existantes
-- des tables quiz_rooms / rounds. Drop+recreate des nouvelles tables/RPC.
-- =============================================================================

-- 1. quiz_rooms : ajout mode (default 'buzzer' = comportement actuel)
alter table public.quiz_rooms
  add column if not exists mode text not null default 'buzzer';

alter table public.quiz_rooms
  drop constraint if exists quiz_rooms_mode_check;

alter table public.quiz_rooms
  add constraint quiz_rooms_mode_check check (mode in ('buzzer', 'questions'));

-- 2. quiz_questions : questions préparées par l'admin pour un salon
drop table if exists public.quiz_answers   cascade;
drop table if exists public.quiz_options   cascade;
drop table if exists public.quiz_questions cascade;

create table public.quiz_questions (
  id          uuid primary key default uuid_generate_v4(),
  room_id     uuid not null references public.quiz_rooms (id) on delete cascade,
  position    integer not null default 0,
  text        text not null,
  image_path  text,
  created_at  timestamptz not null default now()
);
create index quiz_questions_room_id_idx on public.quiz_questions (room_id, position);

-- 3. quiz_options : choix de réponse pour chaque question
create table public.quiz_options (
  id           uuid primary key default uuid_generate_v4(),
  question_id  uuid not null references public.quiz_questions (id) on delete cascade,
  label        text not null,
  is_correct   boolean not null default false,
  position     integer not null default 0
);
create index quiz_options_question_id_idx on public.quiz_options (question_id, position);

-- 4. rounds : on lie chaque manche à une question (nullable, utilisé en mode questions)
alter table public.rounds
  add column if not exists question_id uuid references public.quiz_questions (id) on delete set null;

-- 5. quiz_answers : réponse d'un user pour une manche (mode questions)
create table public.quiz_answers (
  id           uuid primary key default uuid_generate_v4(),
  round_id     uuid not null references public.rounds (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  option_id    uuid not null references public.quiz_options (id) on delete cascade,
  answered_at  timestamptz not null default clock_timestamp(),
  unique (round_id, user_id)
);
create index quiz_answers_round_id_idx on public.quiz_answers (round_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.quiz_questions enable row level security;
alter table public.quiz_options   enable row level security;
alter table public.quiz_answers   enable row level security;

-- drop policies si elles existent
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('quiz_questions', 'quiz_options', 'quiz_answers')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end$$;

-- Questions : visibles par les authentifiés si la room n'est pas draft (ou admin)
create policy "quiz_questions_select_visible"
  on public.quiz_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.quiz_rooms qr
      where qr.id = room_id
        and (qr.status <> 'draft' or public.is_admin())
    )
  );

create policy "quiz_questions_admin_write"
  on public.quiz_questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Options : visibles par tout authentifié pour les questions visibles.
-- ⚠️ `is_correct` est exposé. Les users honnêtes ne vont pas inspecter mais
-- pour usage strict il faudrait deux vues (avec/sans is_correct). v1 : on accepte.
create policy "quiz_options_select_visible"
  on public.quiz_options for select
  to authenticated
  using (
    exists (
      select 1
      from public.quiz_questions q
      join public.quiz_rooms qr on qr.id = q.room_id
      where q.id = question_id
        and (qr.status <> 'draft' or public.is_admin())
    )
  );

create policy "quiz_options_admin_write"
  on public.quiz_options for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Answers : lecture par soi-même ou admin. Insertion bloquée (passe par RPC cast_answer).
create policy "quiz_answers_select_own_or_admin"
  on public.quiz_answers for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "quiz_answers_admin_delete"
  on public.quiz_answers for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- RPC
-- =============================================================================

-- Démarre une manche liée à une question donnée.
-- Si une manche est active, elle est clôturée d'abord.
drop function if exists public.start_question_round(uuid, uuid) cascade;

create function public.start_question_round(p_room_id uuid, p_question_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id    uuid;
  v_next_number integer;
  v_room_mode   text;
  v_q_room_id   uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  -- Vérifs cohérence
  select mode into v_room_mode from public.quiz_rooms where id = p_room_id;
  if v_room_mode is null then
    raise exception 'room not found';
  end if;
  if v_room_mode <> 'questions' then
    raise exception 'room is not in questions mode';
  end if;

  select room_id into v_q_room_id from public.quiz_questions where id = p_question_id;
  if v_q_room_id is null or v_q_room_id <> p_room_id then
    raise exception 'question does not belong to this room';
  end if;

  -- Clôt la manche active si présente
  update public.rounds
  set is_active = false, ended_at = now()
  where room_id = p_room_id and is_active;

  -- Nouveau numéro
  select coalesce(max(round_number), 0) + 1 into v_next_number
  from public.rounds where room_id = p_room_id;

  insert into public.rounds (room_id, round_number, is_active, question_id)
  values (p_room_id, v_next_number, true, p_question_id)
  returning id into v_round_id;

  -- Force le salon en 'open' si encore draft
  update public.quiz_rooms set status = 'open'
  where id = p_room_id and status = 'draft';

  return v_round_id;
end;
$$;

-- Termine la manche question active et attribue +1 point par bonne réponse.
drop function if exists public.end_question_round(uuid) cascade;

create function public.end_question_round(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select id into v_round_id
  from public.rounds
  where room_id = p_room_id and is_active
  limit 1;

  if v_round_id is null then
    return; -- rien à faire
  end if;

  -- +1 point par bonne réponse pour chaque équipe (somme des bonnes réponses
  -- de ses membres sur cette manche).
  with good_answers as (
    select p.team_id, count(*)::integer as n
    from public.quiz_answers a
    join public.quiz_options o on o.id = a.option_id
    join public.profiles p     on p.id = a.user_id
    where a.round_id = v_round_id
      and o.is_correct
      and p.team_id is not null
    group by p.team_id
  )
  update public.teams t
  set score = t.score + ga.n
  from good_answers ga
  where ga.team_id = t.id;

  -- Clôt la manche
  update public.rounds
  set is_active = false, ended_at = now()
  where id = v_round_id;
end;
$$;

-- Vote pour une option dans la manche question active. Idempotent : si déjà
-- répondu, retourne sans erreur.
drop function if exists public.cast_answer(uuid, uuid) cascade;

create function public.cast_answer(p_room_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_round_id    uuid;
  v_question_id uuid;
  v_opt_q_id    uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- Manche active de la room
  select id, question_id
  into v_round_id, v_question_id
  from public.rounds
  where room_id = p_room_id and is_active
  limit 1;

  if v_round_id is null then
    raise exception 'no active round for room %', p_room_id;
  end if;
  if v_question_id is null then
    raise exception 'active round has no question';
  end if;

  -- L'option doit appartenir à la question
  select question_id into v_opt_q_id
  from public.quiz_options where id = p_option_id;
  if v_opt_q_id is null or v_opt_q_id <> v_question_id then
    raise exception 'option does not belong to current question';
  end if;

  insert into public.quiz_answers (round_id, user_id, option_id)
  values (v_round_id, v_user_id, p_option_id)
  on conflict (round_id, user_id) do nothing;
end;
$$;

-- =============================================================================
-- VIEW : answers agrégées par option (résultat live)
-- =============================================================================
drop view if exists public.quiz_answers_count cascade;

create view public.quiz_answers_count
with (security_invoker = true)
as
select
  a.round_id,
  o.question_id,
  a.option_id,
  o.label,
  o.is_correct,
  count(*)::integer as n_votes
from public.quiz_answers a
join public.quiz_options o on o.id = a.option_id
group by a.round_id, o.question_id, a.option_id, o.label, o.is_correct;

-- =============================================================================
-- REALTIME : ajout des nouvelles tables à la publication
-- =============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.quiz_answers;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.quiz_questions;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.quiz_options;
  exception when others then null;
  end;
end$$;
