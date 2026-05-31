-- =============================================================================
-- CAP Games — Fonctions et triggers
-- =============================================================================

-- =============================================================================
-- helper: vérifier si l'utilisateur courant est admin
-- SECURITY DEFINER pour éviter une récursion infinie dans les RLS policies
-- =============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- =============================================================================
-- trigger: création automatique du profil au signup
-- Applique aussi le rattachement à une équipe via team_email_invites
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  -- récupère l'équipe pré-enregistrée pour cet e-mail
  select team_id into v_team_id
  from public.team_email_invites
  where lower(email) = lower(new.email)
  limit 1;

  insert into public.profiles (id, email, full_name, team_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    v_team_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- RPC: place_buzz
-- Pose un buzz pour la manche active du salon. Timestamp serveur autoritaire.
-- Idempotent : si l'utilisateur a déjà buzzé, renvoie le buzz existant.
-- =============================================================================
create or replace function public.place_buzz(p_room_id uuid)
returns table (
  id uuid,
  round_id uuid,
  user_id uuid,
  buzzed_at timestamptz,
  buzz_position integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- récupère la manche active
  select r.id into v_round_id
  from public.rounds r
  where r.room_id = p_room_id and r.is_active
  limit 1;

  if v_round_id is null then
    raise exception 'no active round for room %', p_room_id;
  end if;

  -- insère le buzz (ignoré si doublon)
  insert into public.buzzes (round_id, user_id)
  values (v_round_id, v_user_id)
  on conflict (round_id, user_id) do nothing;

  -- renvoie le buzz (existant ou nouveau) avec sa position dans l'ordre
  return query
  with ordered as (
    select
      b.id,
      b.round_id,
      b.user_id,
      b.buzzed_at,
      (row_number() over (order by b.buzzed_at))::integer as buzz_position
    from public.buzzes b
    where b.round_id = v_round_id
  )
  select ordered.id, ordered.round_id, ordered.user_id, ordered.buzzed_at, ordered.buzz_position
  from ordered
  where ordered.user_id = v_user_id;
end;
$$;

-- =============================================================================
-- RPC: start_round
-- Démarre une nouvelle manche dans un salon (clôt la précédente si nécessaire)
-- =============================================================================
create or replace function public.start_round(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_round_id uuid;
  v_next_number integer;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  -- clôt la manche active si elle existe
  update public.rounds
  set is_active = false, ended_at = now()
  where room_id = p_room_id and is_active;

  -- numéro de la nouvelle manche
  select coalesce(max(round_number), 0) + 1 into v_next_number
  from public.rounds
  where room_id = p_room_id;

  insert into public.rounds (room_id, round_number, is_active)
  values (p_room_id, v_next_number, true)
  returning id into v_new_round_id;

  -- bascule le salon en 'open' si encore en draft
  update public.quiz_rooms
  set status = 'open'
  where id = p_room_id and status = 'draft';

  return v_new_round_id;
end;
$$;

-- =============================================================================
-- RPC: end_round
-- Termine la manche active sans en démarrer une nouvelle
-- =============================================================================
create or replace function public.end_round(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  update public.rounds
  set is_active = false, ended_at = now()
  where room_id = p_room_id and is_active;
end;
$$;

-- =============================================================================
-- RPC: adjust_team_score
-- Ajoute (delta > 0) ou retire (delta < 0) des points à une équipe
-- =============================================================================
create or replace function public.adjust_team_score(p_team_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_score integer;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  update public.teams
  set score = score + p_delta
  where id = p_team_id
  returning score into v_new_score;

  return v_new_score;
end;
$$;

-- =============================================================================
-- RPC: set_admin
-- Promeut ou révoque un utilisateur (admin only)
-- =============================================================================
create or replace function public.set_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  update public.profiles
  set is_admin = p_is_admin
  where id = p_user_id;
end;
$$;

-- =============================================================================
-- RPC: cast_vote
-- Vote dans un sondage, en vérifiant que le choix n'est pas restreint à l'équipe
-- =============================================================================
create or replace function public.cast_vote(p_poll_id uuid, p_choice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_team uuid;
  v_restricted_team uuid;
  v_poll_status public.poll_status;
  v_choice_poll uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- vérifie que le sondage est ouvert
  select status into v_poll_status from public.polls where id = p_poll_id;
  if v_poll_status is null then
    raise exception 'poll not found';
  end if;
  if v_poll_status <> 'open' then
    raise exception 'poll is not open';
  end if;

  -- vérifie que le choix appartient bien au sondage
  select poll_id, restricted_team_id into v_choice_poll, v_restricted_team
  from public.poll_choices where id = p_choice_id;
  if v_choice_poll is null or v_choice_poll <> p_poll_id then
    raise exception 'choice does not belong to poll';
  end if;

  -- vérifie la restriction d'équipe
  if v_restricted_team is not null then
    select team_id into v_user_team from public.profiles where id = v_user_id;
    if v_user_team is not null and v_user_team = v_restricted_team then
      raise exception 'cannot vote for own team';
    end if;
  end if;

  insert into public.poll_votes (poll_id, user_id, choice_id)
  values (p_poll_id, v_user_id, p_choice_id);
end;
$$;
