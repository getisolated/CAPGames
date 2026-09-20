#!/bin/sh
# Construit l'image de l'app pour le test local, avec les URLs de deploy/.env.
#   sh deploy/scripts/build-local.sh
set -e
here=$(cd "$(dirname "$0")/../.." && pwd)
env_file="$here/deploy/.env"
[ -f "$env_file" ] || { echo "deploy/.env manquant : sh deploy/scripts/gen-env.sh --local"; exit 1; }

url=$(grep '^SUPABASE_PUBLIC_URL=' "$env_file" | cut -d= -f2-)
anon=$(grep '^ANON_KEY=' "$env_file" | cut -d= -f2-)

echo "Build capgames-app:local avec NEXT_PUBLIC_SUPABASE_URL=$url"
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$url" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon" \
  -t capgames-app:local \
  "$here"
