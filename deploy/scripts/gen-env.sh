#!/bin/sh
# =============================================================================
# Génère deploy/.env à partir de deploy/.env.example avec des secrets frais.
#
#   sh deploy/scripts/gen-env.sh            # prod (domaines capgames.fr)
#   sh deploy/scripts/gen-env.sh --local    # test local sur le Mac
#
# Refuse d'écraser un .env existant (supprimer le fichier pour régénérer :
# ATTENTION, changer JWT_SECRET/POSTGRES_PASSWORD après le 1er démarrage casse
# la base existante).
#
# Génération de tokens dérivée de utils/generate-keys.sh (Supabase, Apache 2.0).
# =============================================================================
set -e

here=$(cd "$(dirname "$0")/.." && pwd)
example="$here/.env.example"
target="$here/.env"

if [ -f "$target" ]; then
  echo "❌ $target existe déjà. Supprime-le d'abord si tu veux vraiment régénérer les secrets."
  exit 1
fi
command -v openssl >/dev/null 2>&1 || { echo "openssl requis"; exit 1; }

b64url() { openssl enc -base64 -A | tr '+/' '-_' | tr -d '='; }

jwt_secret=$(openssl rand -base64 30)
header='{"alg":"HS256","typ":"JWT"}'
iat=$(date +%s)
exp=$((iat + 5 * 3600 * 24 * 365))

gen_token() {
  payload_b64=$(printf %s "$1" | b64url)
  header_b64=$(printf %s "$header" | b64url)
  signed="${header_b64}.${payload_b64}"
  sig=$(printf %s "$signed" | openssl dgst -binary -sha256 -hmac "$jwt_secret" | b64url)
  printf '%s' "${signed}.${sig}"
}

anon_key=$(gen_token "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")
service_key=$(gen_token "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")
pg_password=$(openssl rand -hex 16)
secret_key_base=$(openssl rand -base64 48)
realtime_enc=$(openssl rand -hex 8)

cp "$example" "$target"

setvar() {
  # setvar KEY VALUE — remplace la ligne KEY=... (| comme séparateur : les JWT contiennent des /)
  sed -i.bak -e "s|^$1=.*$|$1=$2|" "$target" && rm -f "$target.bak"
}

setvar POSTGRES_PASSWORD "$pg_password"
setvar JWT_SECRET "$jwt_secret"
setvar ANON_KEY "$anon_key"
setvar SERVICE_ROLE_KEY "$service_key"
setvar SECRET_KEY_BASE "$secret_key_base"
setvar REALTIME_DB_ENC_KEY "$realtime_enc"

if [ "$1" = "--local" ]; then
  lan_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
  lan_ip=${lan_ip:-127.0.0.1}
  setvar APP_SITE "http://localhost:8080"
  setvar API_SITE "http://:8000"
  setvar API_HOST "api.localtest"
  setvar SITE_URL "http://localhost:8080"
  setvar ADDITIONAL_REDIRECT_URLS "http://localhost:8080/**"
  setvar SUPABASE_PUBLIC_URL "http://$lan_ip:8000"
  setvar API_EXTERNAL_URL "http://$lan_ip:8000/auth/v1"
  setvar APP_IMAGE "capgames-app:local"
  setvar ALLOWED_EMAIL_DOMAINS "*"
  setvar SMTP_PASS "unused-local"
  echo "✅ $target généré en mode LOCAL (API sur http://$lan_ip:8000, app sur http://localhost:8080)"
else
  echo "✅ $target généré en mode PROD."
  echo "   ➜ Renseigne SMTP_PASS (clé API Resend) avant de démarrer."
fi

echo ""
echo "Clés à reporter dans GitHub (Settings → Secrets and variables → Actions → Variables) :"
echo "  NEXT_PUBLIC_SUPABASE_URL      = $(grep '^SUPABASE_PUBLIC_URL=' "$target" | cut -d= -f2-)"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY = $anon_key"
