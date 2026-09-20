#!/bin/sh
# Déploiement manuel côté serveur (GitHub Actions fait la même chose).
#   cd /opt/capgames/deploy && sh scripts/deploy.sh
set -e
cd "$(dirname "$0")/.."
docker compose pull app
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
docker compose ps
