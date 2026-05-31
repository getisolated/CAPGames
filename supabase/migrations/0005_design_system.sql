-- =============================================================================
-- CAP Games — Champs design system (couleur équipe, short, style buzzer)
-- ⚠️ Idempotent : peut être ré-exécuté sans erreur.
-- =============================================================================

-- Colonnes équipes (sans destruction des données)
alter table public.teams
  add column if not exists color text,
  add column if not exists short text;

-- Colonne buzzer_style + sa contrainte
alter table public.quiz_rooms
  add column if not exists buzzer_style text not null default 'circle';

alter table public.quiz_rooms
  drop constraint if exists quiz_rooms_buzzer_style_check;

alter table public.quiz_rooms
  add constraint quiz_rooms_buzzer_style_check
  check (buzzer_style in ('circle', 'arcade', 'physical'));

-- Vue leaderboard enrichie — DROP requis car les colonnes changent au milieu
drop view if exists public.leaderboard cascade;

create view public.leaderboard
with (security_invoker = true)
as
select
  id,
  name,
  logo_url,
  score,
  color,
  short,
  row_number() over (order by score desc, name asc)::integer as rank
from public.teams;
