-- =============================================================================
-- CAP Games — Champs design system (couleur équipe, short, style buzzer)
-- =============================================================================

alter table public.teams
  add column if not exists color text,
  add column if not exists short text;

alter table public.quiz_rooms
  add column if not exists buzzer_style text not null default 'circle'
  check (buzzer_style in ('circle', 'arcade', 'physical'));

-- Vue leaderboard enrichie (couleur + short)
create or replace view public.leaderboard
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
