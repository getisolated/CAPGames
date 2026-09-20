#!/bin/sh
# =============================================================================
# Applique les migrations SQL (supabase/migrations/*.sql) dans le Postgres
# de la stack Docker.
#
#   sh deploy/scripts/apply-migrations.sh --all            # base NEUVE uniquement
#   sh deploy/scripts/apply-migrations.sh 0013_xxx.sql     # une ou plusieurs migrations
#
# ⚠️  --all rejoue 0001 → 0004 qui sont DESTRUCTIVES (drop table cascade).
#     À utiliser sur une base vide, jamais sur une base avec des données.
# =============================================================================
set -e
root=$(cd "$(dirname "$0")/../.." && pwd)
mig="$root/supabase/migrations"
compose="docker compose -f $root/deploy/docker-compose.yml"
[ -f "$root/deploy/docker-compose.local.yml" ] && [ "${LOCAL:-}" = "1" ] && compose="$compose -f $root/deploy/docker-compose.local.yml"
role=${PG_ROLE:-supabase_admin}

if [ "$1" = "--all" ]; then
  files=$(ls "$mig"/*.sql | sort)
  echo "⚠️  Application de TOUTES les migrations (destructif sur une base existante)."
elif [ -n "$1" ]; then
  files=""
  for f in "$@"; do
    case "$f" in
      /*) files="$files $f" ;;
      *) files="$files $mig/$(basename "$f")" ;;
    esac
  done
else
  echo "Usage: $0 --all | <fichier.sql> [...]"
  exit 1
fi

for f in $files; do
  echo "▶ $(basename "$f")"
  $compose exec -T db psql -v ON_ERROR_STOP=1 -q -U "$role" -d postgres < "$f"
done
echo "✅ Migrations appliquées."
