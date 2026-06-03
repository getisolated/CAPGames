-- =============================================================================
-- CAP Games — RPC pour fixer un score d'équipe à une valeur absolue
-- ⚠️ Idempotente : peut être ré-exécutée.
-- =============================================================================

drop function if exists public.set_team_score(uuid, integer) cascade;

create function public.set_team_score(p_team_id uuid, p_score integer)
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
  set score = greatest(p_score, 0)
  where id = p_team_id
  returning score into v_new_score;

  return v_new_score;
end;
$$;
