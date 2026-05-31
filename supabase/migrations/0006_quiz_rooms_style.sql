-- =============================================================================
-- CAP Games — Personnalisation visuelle des salons quizz
-- ⚠️ Idempotent : peut être ré-exécuté sans erreur.
-- =============================================================================

alter table public.quiz_rooms
  add column if not exists color text not null default 'ember',
  add column if not exists icon  text not null default 'buzzer';
