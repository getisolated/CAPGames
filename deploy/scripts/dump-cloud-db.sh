#!/bin/sh
# =============================================================================
# Exporte les DONNÉES du projet Supabase cloud (pas le schéma : il vient des
# migrations) vers deploy/data/cloud-data.sql.
#
#   CLOUD_DB_URL='postgresql://postgres.xxxx:MOTDEPASSE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres' \
#     sh deploy/scripts/dump-cloud-db.sh
#
# Où trouver CLOUD_DB_URL : dashboard Supabase → Connect → "Session pooler"
# (IPv4, port 5432). Le mot de passe est celui de la base, pas du compte.
#
# Tables exportées : public.* + auth.users + auth.identities.
# Storage : les fichiers sont exportés séparément (export-storage.mjs) ; les
# lignes storage.objects sont recréées par l'import.
# =============================================================================
set -e
[ -n "$CLOUD_DB_URL" ] || { echo "CLOUD_DB_URL manquant"; exit 1; }
root=$(cd "$(dirname "$0")/../.." && pwd)
out="$root/deploy/data"
mkdir -p "$out"

echo "▶ pg_dump (données uniquement) via docker postgres:17…"
docker run --rm -i postgres:17 pg_dump "$CLOUD_DB_URL" \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --no-comments \
  --table='public.*' \
  --table='auth.users' \
  --table='auth.identities' \
  > "$out/cloud-data.sql"

lines=$(wc -l < "$out/cloud-data.sql" | tr -d ' ')
echo "✅ $out/cloud-data.sql ($lines lignes)"
echo "   Aperçu des tables : $(grep -o 'INSERT INTO [a-z_.]*' "$out/cloud-data.sql" | sort | uniq -c | sort -rn | head -20 | awk '{printf "%s×%s ", $4, $1}')"
