#!/bin/sh
# =============================================================================
# Restaure deploy/data/cloud-data.sql dans le Postgres de la stack Docker,
# puis réécrit les URLs absolues de logos d'équipe.
#
#   CLOUD_SUPABASE_URL='https://xxxx.supabase.co' sh deploy/scripts/restore-db.sh
#
# Prérequis : migrations appliquées (schéma présent), tables vides.
# Le chargement se fait en session_replication_role=replica : les triggers
# (dont on_auth_user_created) et les contraintes FK sont désactivés le temps
# de l'import, ce qui évite les doublons de profils et les problèmes d'ordre.
# =============================================================================
set -e
root=$(cd "$(dirname "$0")/../.." && pwd)
dump="$root/deploy/data/cloud-data.sql"
[ -f "$dump" ] || { echo "$dump introuvable : lance dump-cloud-db.sh d'abord"; exit 1; }
compose="docker compose -f $root/deploy/docker-compose.yml"
[ "${LOCAL:-}" = "1" ] && compose="$compose -f $root/deploy/docker-compose.local.yml"

new_url=$(grep '^SUPABASE_PUBLIC_URL=' "$root/deploy/.env" | cut -d= -f2-)

echo "▶ Import des données (transaction unique)…"
{
  echo "set session_replication_role = replica;"
  cat "$dump"
} | $compose exec -T db psql -v ON_ERROR_STOP=1 -q --single-transaction -U supabase_admin -d postgres

if [ -n "$CLOUD_SUPABASE_URL" ]; then
  echo "▶ Réécriture des URLs de logos : $CLOUD_SUPABASE_URL → $new_url"
  $compose exec -T db psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -c \
    "update public.teams set logo_url = replace(logo_url, '$CLOUD_SUPABASE_URL', '$new_url') where logo_url like '$CLOUD_SUPABASE_URL%';"
else
  echo "ℹ️  CLOUD_SUPABASE_URL non fourni : logos d'équipe non réécrits (à faire à la main si besoin)."
fi

echo "▶ Comptages :"
$compose exec -T db psql -U supabase_admin -d postgres -c "
select 'auth.users' t, count(*) from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'teams', count(*) from public.teams
union all select 'photos', count(*) from public.photos
union all select 'polls', count(*) from public.polls
union all select 'quiz_rooms', count(*) from public.quiz_rooms;"
echo "✅ Restauration terminée."
