-- =============================================================================
-- CAP Games — Mode questions : pas d'attribution auto de points
-- ⚠️ Idempotente : peut être ré-exécutée.
-- =============================================================================

drop function if exists public.end_question_round(uuid) cascade;

create function public.end_question_round(p_room_id uuid)
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
    return;
  end if;

  update public.rounds
  set is_active = false, ended_at = now()
  where id = v_round_id;
end;
$$;
