-- =============================================================================
-- CAP Games — Vues de comptage agrégées correctes pour les non-admins
-- ⚠️ Idempotente.
--
-- Problème corrigé : poll_results et quiz_answers_count étaient en
-- security_invoker = true, donc soumises au RLS de poll_votes / quiz_answers
-- (chaque user ne voit QUE ses propres votes). Résultat : un joueur non-admin
-- voyait des totaux faux (seulement son vote) à la clôture / révélation.
--
-- Solution : vues en SECURITY DEFINER (security_invoker = false). Elles
-- n'exposent QUE des compteurs agrégés — jamais l'identité des votants
-- (la confidentialité reste assurée par le RLS sur les tables de base).
-- =============================================================================

-- ---- poll_results -----------------------------------------------------------
drop view if exists public.poll_results cascade;

create view public.poll_results
with (security_invoker = false)
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

grant select on public.poll_results to anon, authenticated;

-- ---- quiz_answers_count -----------------------------------------------------
drop view if exists public.quiz_answers_count cascade;

create view public.quiz_answers_count
with (security_invoker = false)
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

grant select on public.quiz_answers_count to anon, authenticated;
