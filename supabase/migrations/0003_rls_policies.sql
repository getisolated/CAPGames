-- =============================================================================
-- CAP Games — Row Level Security
-- =============================================================================

-- Activation RLS sur toutes les tables
alter table public.profiles            enable row level security;
alter table public.teams               enable row level security;
alter table public.team_email_invites  enable row level security;
alter table public.quiz_rooms          enable row level security;
alter table public.rounds              enable row level security;
alter table public.buzzes              enable row level security;
alter table public.photo_albums        enable row level security;
alter table public.photos              enable row level security;
alter table public.polls               enable row level security;
alter table public.poll_choices        enable row level security;
alter table public.poll_votes          enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own_limited"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select is_admin from public.profiles where id = auth.uid()));

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- teams
-- =============================================================================
create policy "teams_select_authenticated"
  on public.teams for select
  to authenticated
  using (true);

create policy "teams_admin_write"
  on public.teams for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- team_email_invites — admin only
-- =============================================================================
create policy "team_email_invites_admin"
  on public.team_email_invites for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- quiz_rooms
-- =============================================================================
create policy "quiz_rooms_select_open"
  on public.quiz_rooms for select
  to authenticated
  using (status <> 'draft' or public.is_admin());

create policy "quiz_rooms_admin_write"
  on public.quiz_rooms for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- rounds
-- =============================================================================
create policy "rounds_select_authenticated"
  on public.rounds for select
  to authenticated
  using (true);

create policy "rounds_admin_write"
  on public.rounds for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- buzzes
-- L'insertion publique est interdite : on passe par la RPC place_buzz qui est
-- security definer. Lecture autorisée à tous les authentifiés (pour Realtime).
-- =============================================================================
create policy "buzzes_select_authenticated"
  on public.buzzes for select
  to authenticated
  using (true);

create policy "buzzes_admin_delete"
  on public.buzzes for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- photo_albums
-- =============================================================================
create policy "photo_albums_select_authenticated"
  on public.photo_albums for select
  to authenticated
  using (true);

create policy "photo_albums_admin_write"
  on public.photo_albums for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- photos
-- - Lecture : status=approved (tout user), ou photo perso, ou admin
-- - Insertion : tout user authentifié, status forcé à 'pending'
-- - Update/Delete : admin only
-- =============================================================================
create policy "photos_select_approved_or_own"
  on public.photos for select
  to authenticated
  using (
    status = 'approved'
    or uploaded_by = auth.uid()
    or public.is_admin()
  );

create policy "photos_insert_pending"
  on public.photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and status = 'pending'
  );

create policy "photos_admin_modify"
  on public.photos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "photos_admin_delete"
  on public.photos for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- polls
-- =============================================================================
create policy "polls_select_visible"
  on public.polls for select
  to authenticated
  using (status <> 'draft' or public.is_admin());

create policy "polls_admin_write"
  on public.polls for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- poll_choices
-- =============================================================================
create policy "poll_choices_select_visible"
  on public.poll_choices for select
  to authenticated
  using (
    exists (
      select 1 from public.polls p
      where p.id = poll_id and (p.status <> 'draft' or public.is_admin())
    )
  );

create policy "poll_choices_admin_write"
  on public.poll_choices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- poll_votes
-- - Lecture : son propre vote, ou admin (les résultats agrégés passent par une vue)
-- - Insertion : interdite via RLS, on passe par RPC cast_vote (security definer)
-- =============================================================================
create policy "poll_votes_select_own_or_admin"
  on public.poll_votes for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
