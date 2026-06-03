-- =============================================================================
-- CAP Games — Fiabiliser le Realtime (events UPDATE/DELETE filtrés)
-- ⚠️ Idempotente.
--
-- Problème corrigé : un abonnement postgres_changes filtré (ex. rounds par
-- room_id) ne reçoit pas de manière fiable les events UPDATE/DELETE si la table
-- est en REPLICA IDENTITY DEFAULT (l'ancienne ligne ne contient que la PK, donc
-- le filtre ne peut pas être évalué). On passe les tables concernées en FULL.
--
-- Concrètement : la révélation des réponses (UPDATE rounds.revealed) et la fin
-- de manche (UPDATE rounds) deviennent instantanées côté joueurs.
-- =============================================================================

alter table public.rounds        replica identity full;
alter table public.teams         replica identity full;
alter table public.poll_votes    replica identity full;
alter table public.quiz_answers  replica identity full;
alter table public.buzzes        replica identity full;
alter table public.polls         replica identity full;
alter table public.photos        replica identity full;
alter table public.quiz_rooms    replica identity full;

-- Garantir que toutes les tables temps réel sont publiées (no-op si déjà fait).
do $$
declare
  tables text[] := array[
    'rounds', 'buzzes', 'quiz_rooms', 'teams', 'polls', 'poll_votes',
    'photos', 'quiz_questions', 'quiz_options', 'quiz_answers'
  ];
  t text;
begin
  foreach t in array tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then
      null; -- déjà dans la publication
    end;
  end loop;
end$$;
