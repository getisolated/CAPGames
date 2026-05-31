-- =============================================================================
-- CAP Games — Vues, Realtime et Storage
-- ⚠️ DESTRUCTIF pour les vues, policies storage et publication realtime.
-- Les buckets et fichiers existants sont CONSERVÉS (on conflict do nothing).
-- =============================================================================

-- Drop des vues
drop view if exists public.poll_results   cascade;
drop view if exists public.leaderboard    cascade;
drop view if exists public.buzzes_ordered cascade;

-- Retrait des tables de la publication realtime (no-op si pas dedans)
do $$
declare
  tables text[] := array[
    'buzzes', 'rounds', 'quiz_rooms', 'teams', 'polls', 'poll_votes', 'photos'
  ];
  t text;
begin
  foreach t in array tables loop
    begin
      execute format('alter publication supabase_realtime drop table public.%I', t);
    exception when others then
      -- table pas dans la publication ou publication absente : on ignore
      null;
    end;
  end loop;
end$$;

-- Drop des policies storage (recréées plus bas)
drop policy if exists "team_logos_write_admin"                  on storage.objects;
drop policy if exists "poll_choices_write_admin"                on storage.objects;
drop policy if exists "photos_insert_own"                       on storage.objects;
drop policy if exists "photos_select_approved_or_own_or_admin"  on storage.objects;
drop policy if exists "photos_delete_admin"                     on storage.objects;
drop policy if exists "photos_update_admin"                     on storage.objects;

-- =============================================================================
-- VIEW: poll_results — résultats agrégés (anonymes) d'un sondage
-- Lisible par tous les authentifiés ; le filtrage par statut se fait via l'app.
-- =============================================================================
create or replace view public.poll_results
with (security_invoker = true)
as
select
  pc.poll_id,
  pc.id as choice_id,
  pc.label,
  pc.image_path,
  count(pv.id)::integer as votes
from public.poll_choices pc
left join public.poll_votes pv on pv.choice_id = pc.id
group by pc.poll_id, pc.id, pc.label, pc.image_path;

-- =============================================================================
-- VIEW: leaderboard — équipes triées par score
-- =============================================================================
create or replace view public.leaderboard
with (security_invoker = true)
as
select
  id,
  name,
  logo_url,
  score,
  row_number() over (order by score desc, name asc)::integer as rank
from public.teams;

-- =============================================================================
-- VIEW: buzzes_ordered — buzzes d'une manche avec position et infos user
-- =============================================================================
create or replace view public.buzzes_ordered
with (security_invoker = true)
as
select
  b.id,
  b.round_id,
  b.user_id,
  b.buzzed_at,
  row_number() over (partition by b.round_id order by b.buzzed_at)::integer as position,
  p.full_name as user_name,
  p.email as user_email,
  t.id as team_id,
  t.name as team_name,
  t.logo_url as team_logo_url
from public.buzzes b
join public.profiles p on p.id = b.user_id
left join public.teams t on t.id = p.team_id;

-- =============================================================================
-- REALTIME — publication des tables nécessaires
-- =============================================================================
alter publication supabase_realtime add table public.buzzes;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.quiz_rooms;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.photos;

-- =============================================================================
-- STORAGE — buckets et policies
-- À exécuter dans le SQL Editor (les buckets peuvent aussi être créés via UI)
-- =============================================================================

-- team-logos : public en lecture, admin en écriture
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- photos : privé, lecture/écriture conditionnelles
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- poll-choices : public en lecture, admin en écriture
insert into storage.buckets (id, name, public)
values ('poll-choices', 'poll-choices', true)
on conflict (id) do nothing;

-- Policies storage.objects
-- team-logos : SELECT public (bucket public), INSERT/UPDATE/DELETE admin
create policy "team_logos_write_admin"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'team-logos' and public.is_admin())
  with check (bucket_id = 'team-logos' and public.is_admin());

-- poll-choices : idem
create policy "poll_choices_write_admin"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'poll-choices' and public.is_admin())
  with check (bucket_id = 'poll-choices' and public.is_admin());

-- photos : tout user authentifié peut upload (clé préfixée par son uid).
-- Lecture autorisée si l'utilisateur est admin, ou si l'objet correspond à une
-- photo en status 'approved', ou si c'est sa propre photo.
create policy "photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos_select_approved_or_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.photos ph
        where ph.storage_path = storage.objects.name
          and ph.status = 'approved'
      )
    )
  );

create policy "photos_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());

create policy "photos_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and public.is_admin())
  with check (bucket_id = 'photos' and public.is_admin());
