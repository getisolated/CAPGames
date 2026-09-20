# Déploiement CAP Games sur VPS OVH (Docker)

Runbook complet de la migration Vercel + Supabase cloud → VPS OVH (Debian 12,
2 vCPU / 4 Go). Tout tourne en Docker : Supabase auto-hébergé allégé, l'app
Next.js et Caddy (HTTPS automatique).

```
Internet ──443──▶ Caddy ──▶ capgames.fr        → app:3000  (Next.js)
                        └─▶ api.capgames.fr    → /auth/v1     auth:9999   (GoTrue)
                                                 /rest/v1     rest:3000   (PostgREST)
                                                 /realtime/v1 realtime:4000
                                                 /storage/v1  storage:5000 (+ imgproxy)
                                                              db:5432 (Postgres, interne)
```

Fichiers Storage : volume Docker `capgames_storage-data` (le backend fichier
exige les attributs étendus xattr, absents des partages macOS ; sur ext4 OK).
Données Postgres : `deploy/volumes/db/data`.

Fichiers :

| Chemin | Rôle |
|---|---|
| [Dockerfile](Dockerfile) | Image Next.js autonome |
| [deploy/docker-compose.yml](deploy/docker-compose.yml) | Stack de production |
| [deploy/docker-compose.local.yml](deploy/docker-compose.local.yml) | Override pour tester sur le Mac (Mailpit, sans TLS) |
| [deploy/Caddyfile](deploy/Caddyfile) | TLS + routage API + CORS |
| [deploy/.env.example](deploy/.env.example) | Variables ; `deploy/.env` est généré et jamais commité |
| [deploy/volumes/caddy/auth-templates/magic-link.html](deploy/volumes/caddy/auth-templates/magic-link.html) | E-mail OTP |
| [deploy/scripts/](deploy/scripts/) | Scripts serveur, migrations, export/import |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | Build → GHCR → déploiement SSH |

---

## 0. Test local complet (optionnel mais recommandé)

```sh
sh deploy/scripts/gen-env.sh --local        # deploy/.env avec secrets + URLs locales
sh deploy/scripts/build-local.sh            # image capgames-app:local
cd deploy && docker compose -f docker-compose.yml -f docker-compose.local.yml up -d && cd ..
LOCAL=1 sh deploy/scripts/apply-migrations.sh --all
```

- App : http://localhost:8080 · e-mails OTP : http://localhost:8025 (Mailpit)
- Arrêt : `cd deploy && docker compose -f docker-compose.yml -f docker-compose.local.yml down`
- Remise à zéro : ajouter `-v` (supprime le volume Storage) puis `rm -rf deploy/volumes/db/data`

---

## 1. Réinstaller le VPS (manager OVH)

1. Espace client OVH → VPS → **Réinstaller** → **Debian 12**.
2. Coller ta clé SSH publique (`cat ~/.ssh/capgames.pub`, déjà présente sur le Mac) pour ne pas dépendre d'un mot de passe.
3. Noter l'IP du VPS. L'utilisateur OVH par défaut est `debian` (sudo sans mot de passe). Si la clé n'a pas été prise : `ssh-copy-id -i ~/.ssh/capgames.pub debian@IP`.

## 2. Préparer le serveur

```sh
scp -i ~/.ssh/capgames deploy/scripts/server-setup.sh debian@IP:
ssh -i ~/.ssh/capgames debian@IP 'sudo bash server-setup.sh'
```

Le script installe Docker, ufw (22/80/443), fail2ban, un swap de 2 Go, et
crée l'utilisateur `deploy` (groupe docker) propriétaire de `/opt/capgames`.
Ensuite : `ssh deploy@IP`.

## 3. DNS

Le domaine est enregistré chez IONOS mais ses serveurs de noms sont
`ns1/ns2.vercel-dns.com` : la zone qui répond est celle de Vercel, et elle
contient les enregistrements Resend (DKIM `resend._domainkey`, MX et SPF sur
`send.capgames.fr`, MX apex). **Option recommandée : garder les NS Vercel** et
éditer la zone chez Vercel.

Dashboard Vercel → Domains → capgames.fr :

1. Si le domaine est encore rattaché au projet CAP Games, le **détacher**
   (Project → Settings → Domains → Remove). Sinon Vercel garde des A implicites
   vers ses serveurs.
2. Onglet **DNS Records**, ajouter :

| Type | Name | Value | TTL |
|---|---|---|---|
| A | *(vide = apex)* | IP du VPS | 60 |
| A | `api` | IP du VPS | 60 |

3. Supprimer les éventuels A/CNAME explicites de `@` et `www` vers Vercel.
   Ne pas toucher aux enregistrements MX, TXT et `send`.

Vérifier : `dig +short capgames.fr` et `dig +short api.capgames.fr` doivent
renvoyer l'IP du VPS (quelques minutes).

*Alternative* (si on veut quitter Vercel entièrement) : chez IONOS, passer sur
les serveurs de noms IONOS, puis recréer dans la zone IONOS les A ci-dessus
**et** tous les enregistrements Resend (les relire dans Resend → Domains).
Propagation jusqu'à 24 h, OTP indisponibles entre-temps si les DKIM manquent.

## 4. Configurer et lancer la stack

Sur le Mac :

```sh
rm -f deploy/.env                    # si un .env LOCAL existe
sh deploy/scripts/gen-env.sh         # secrets de PROD
```

Éditer `deploy/.env` : `SMTP_PASS` = clé API Resend. Vérifier `SMTP_ADMIN_EMAIL`
(adresse @capgames.fr vérifiée chez Resend).

Copier sur le serveur :

```sh
rsync -av --exclude 'volumes/db/data' --exclude 'data' \
  deploy/ deploy@IP:/opt/capgames/deploy/
rsync -av supabase/migrations/ deploy@IP:/opt/capgames/supabase/migrations/
```

Sur le serveur :

```sh
ssh deploy@IP
cd /opt/capgames/deploy
docker compose pull db auth rest realtime storage imgproxy caddy
docker compose up -d db auth rest realtime storage imgproxy caddy
docker compose ps           # tout doit être "healthy" au bout d'une minute
```

Appliquer le schéma (base neuve) :

```sh
cd /opt/capgames && sh deploy/scripts/apply-migrations.sh --all
```

Tests rapides :

```sh
curl -s https://api.capgames.fr/auth/v1/health
curl -s -H "apikey: $ANON_KEY" https://api.capgames.fr/rest/v1/teams   # [] attendu
```

## 5. Reprendre les données du Supabase cloud

Sur le Mac, depuis la racine du repo :

```sh
# 1. données (dashboard Supabase → Connect → Session pooler, IPv4)
CLOUD_DB_URL='postgresql://postgres.xxxx:MDP@aws-0-eu-central-1.pooler.supabase.com:5432/postgres' \
  sh deploy/scripts/dump-cloud-db.sh

# 2. fichiers des buckets (Settings → API → service_role)
CLOUD_SUPABASE_URL=https://xxxx.supabase.co CLOUD_SERVICE_ROLE_KEY=eyJ... \
  node deploy/scripts/export-storage.mjs

# 3. fichiers → Storage du VPS (lit SUPABASE_PUBLIC_URL + SERVICE_ROLE_KEY dans deploy/.env)
node deploy/scripts/import-storage.mjs

# 4. dump SQL → serveur
rsync -av deploy/data/cloud-data.sql deploy@IP:/opt/capgames/deploy/data/
```

Sur le serveur :

```sh
cd /opt/capgames
CLOUD_SUPABASE_URL=https://xxxx.supabase.co sh deploy/scripts/restore-db.sh
```

Les comptes conservent leur identifiant : chaque personne retrouve son équipe
et ses photos à la première connexion (nouveau code OTP).

## 6. Déploiement automatique (GitHub Actions)

Dans le repo GitHub → Settings → Secrets and variables → Actions :

| Type | Nom | Valeur |
|---|---|---|
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | `https://api.capgames.fr` |
| Variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` de `deploy/.env` |
| Secret | `VPS_HOST` | IP du VPS |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | clé privée dédiée (voir ci-dessous) |

Clé dédiée au déploiement :

```sh
ssh-keygen -t ed25519 -C "github-actions capgames" -f ~/.ssh/capgames_deploy -N ""
ssh-copy-id -i ~/.ssh/capgames_deploy.pub deploy@IP
gh secret set VPS_SSH_KEY < ~/.ssh/capgames_deploy
```

Chaque push sur `main` construit l'image, la pousse sur GHCR et redémarre
`app` sur le VPS. Premier déploiement : pousser sur `main` ou lancer le
workflow à la main (Actions → Deploy → Run workflow).

## 7. Bascule et fin

1. Test bout en bout sur https://capgames.fr : connexion OTP, équipe, buzzer
   à deux téléphones, vote, upload photo, vignettes.
2. Supprimer le projet Vercel (ou le garder, il ne sert plus le domaine).
3. Mettre le projet Supabase cloud **en pause** quelques semaines avant suppression.

---

## Exploitation

| Besoin | Commande (dans `/opt/capgames/deploy`) |
|---|---|
| État | `docker compose ps` |
| Logs | `docker compose logs -f auth` (ou `app`, `caddy`, `realtime`…) |
| psql | `docker compose exec db psql -U supabase_admin -d postgres` |
| Promouvoir un admin | `update public.profiles set is_admin = true where email = '…';` |
| Nouvelle migration | `sh ../deploy/scripts/apply-migrations.sh 0013_xxx.sql` |
| Redéployer à la main | `sh scripts/deploy.sh` |
| Mettre à jour Supabase | changer les tags d'images dans `docker-compose.yml`, `docker compose pull && up -d` |
| Sauvegarde ponctuelle | `docker compose exec -T db pg_dump -U supabase_admin postgres > backup.sql` puis `docker run --rm -v capgames_storage-data:/data -v $PWD:/b alpine tar czf /b/storage.tgz -C /data .` |

### Différences avec le cloud à connaître

- **Rate limits GoTrue** relevées dans `docker-compose.yml` (mails/heure,
  vérifications par IP) : tous les téléphones d'une soirée partagent l'IP du lieu.
- **Template OTP** : `deploy/volumes/caddy/auth-templates/magic-link.html`,
  variable `{{ .Token }}`. Redémarrer `auth` après modification n'est pas
  nécessaire (lu à chaque envoi).
- **Pas de Studio** : tout se fait en psql. Un client graphique (TablePlus,
  DBeaver) marche via un tunnel : `ssh -L 5432:localhost:5432 deploy@IP` après
  avoir ajouté `ports: ["127.0.0.1:5432:5432"]` au service `db`.
- **Pas de sauvegarde automatique** (choix assumé) : la commande ci-dessus
  permet un dump manuel avant chaque soirée.
