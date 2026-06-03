-- =============================================================================
-- CAP Games — Quizz questions : images + étape de révélation
-- ⚠️ Idempotente : peut être ré-exécutée.
-- =============================================================================

-- 1. Colonnes images + message de révélation
alter table public.quiz_questions
  add column if not exists image_path     text,
  add column if not exists reveal_message text;

alter table public.quiz_options
  add column if not exists image_path text;

-- 2. rounds : flag "réponses révélées"
alter table public.rounds
  add column if not exists revealed boolean not null default false;

-- 3. Bucket quiz-media (public en lecture, admin en écriture)
insert into storage.buckets (id, name, public)
values ('quiz-media', 'quiz-media', true)
on conflict (id) do nothing;

drop policy if exists "quiz_media_write_admin"  on storage.objects;
drop policy if exists "quiz_media_select_all"   on storage.objects;

create policy "quiz_media_write_admin"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'quiz-media' and public.is_admin())
  with check (bucket_id = 'quiz-media' and public.is_admin());

-- Lecture : bucket public donc lisible, mais on autorise explicitement les
-- authentifiés (cohérent avec les autres buckets publics).
create policy "quiz_media_select_all"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'quiz-media');

-- =============================================================================
-- RPC : reveal_question_round — passe la manche active en "révélée"
-- Le vote est alors fermé (l'app empêche les nouveaux votes côté client +
-- cast_answer reste possible techniquement, on bloque dans l'app).
-- =============================================================================
drop function if exists public.reveal_question_round(uuid) cascade;

create function public.reveal_question_round(p_room_id uuid)
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
    raise exception 'no active round for room %', p_room_id;
  end if;

  update public.rounds
  set revealed = true
  where id = v_round_id;
end;
$$;

-- =============================================================================
-- RPC : cast_answer — empêcher le vote si la manche est révélée
-- (REPLACE de la version existante)
-- =============================================================================
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
  v_revealed    boolean;
  v_opt_q_id    uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select id, question_id, revealed
  into v_round_id, v_question_id, v_revealed
  from public.rounds
  where room_id = p_room_id and is_active
  limit 1;

  if v_round_id is null then
    raise exception 'no active round for room %', p_room_id;
  end if;
  if v_question_id is null then
    raise exception 'active round has no question';
  end if;
  if v_revealed then
    raise exception 'round already revealed';
  end if;

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
