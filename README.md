# CAP Games

Application web mobile-first pour soirée d'entreprise : authentification passwordless, équipes, buzzer temps réel, galerie photo, sondages avec contraintes métier et classement live.

## Stack

- **Frontend** : Next.js 15+ (App Router), React 19, TypeScript
- **UI** : Tailwind CSS v4 + shadcn/ui (style new-york, base color slate)
- **Backend** : Supabase (PostgreSQL, Auth OTP, Storage, Realtime)
- **Package manager** : pnpm
- **Hébergement** : Vercel

## Démarrage rapide

```powershell
pnpm install
copy .env.local.example .env.local
# éditez .env.local (voir Configuration ci-dessous)
pnpm dev
```

L'app est servie sur http://localhost:3000.

---

## 1. Configuration du projet Supabase

### 1.1 Création

1. Créez un compte sur https://supabase.com (gratuit jusqu'à 500 Mo / 1 Go storage / 50k MAU).
2. Cliquez **New project**. Notez le mot de passe DB (à conserver pour les migrations).
3. Patientez ~2 min pendant l'approvisionnement.

### 1.2 Récupération des clés

Dans **Settings → API** :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY` (uniquement nécessaire si `AUTH_BYPASS_OTP=true`)

### 1.3 Variables d'environnement (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ALLOWED_EMAIL_DOMAINS=capgemini.com,capgames.local
AUTH_BYPASS_OTP=false
```

- **`ALLOWED_EMAIL_DOMAINS`** : liste de domaines autorisés à se connecter (séparés par des virgules, sans `@`).
- **`AUTH_BYPASS_OTP`** : si `true`, le flow d'auth saute la vérification du code 6 chiffres et connecte directement la personne dont l'e-mail est saisi. **À RÉSERVER AU DÉVELOPPEMENT.**

### 1.4 Exécution des migrations SQL

Ouvrez le **SQL Editor** du projet Supabase et exécutez **dans l'ordre** chaque fichier de `supabase/migrations/` :

1. `0001_init.sql` — schéma (tables, types enum, FK, index)
2. `0002_functions_and_triggers.sql` — RPC et trigger `on_auth_user_created`
3. `0003_rls_policies.sql` — Row Level Security
4. `0004_views_realtime_storage.sql` — vues, publication Realtime, buckets Storage

> ⚠️ Le fichier 0004 crée les **buckets Storage**. Si vous préférez les créer via l'UI Supabase, sautez les `insert into storage.buckets…` mais conservez les policies.

### 1.5 Configuration de l'auth Supabase

Dans **Authentication → Providers → Email** :
- ✅ **Enable Email provider**
- ❌ **Confirm email** (pas nécessaire pour OTP)
- ✅ **Enable Email OTP**

Dans **Authentication → URL Configuration** :
- `Site URL` → `http://localhost:3000` en dev, `https://votre-domaine.vercel.app` en prod
- `Redirect URLs` → ajoutez `http://localhost:3000/**` et l'URL de prod

### 1.6 Premier administrateur

Aucune logique de bootstrap automatique n'est exposée. Connectez-vous une première fois avec votre e-mail dans l'app, puis dans le SQL Editor :

```sql
update public.profiles set is_admin = true where email = 'votre.email@domaine.com';
```

Reconnectez-vous et le bouton **Admin** apparaît. Vous pouvez ensuite promouvoir d'autres utilisateurs depuis **/admin/utilisateurs**.

---

## 2. Architecture

### 2.1 Arborescence

```
src/
├── app/
│   ├── (app)/              ← routes authentifiées (layout dédié)
│   │   ├── page.tsx        ← écran d'accueil
│   │   ├── buzzer/         ← liste + salon de buzzer (user)
│   │   ├── photos/         ← galerie photo (user)
│   │   ├── sondages/       ← liste + vote (user)
│   │   ├── classement/     ← leaderboard temps réel
│   │   └── admin/          ← panel admin (équipes, quizz, photos, sondages, points, utilisateurs)
│   ├── auth/callback/      ← callback magic link (bypass OTP)
│   ├── login/              ← page de connexion
│   └── layout.tsx          ← layout racine (Toaster)
├── components/
│   ├── app-shell.tsx       ← header + bottom nav mobile
│   └── ui/                 ← shadcn primitives
├── hooks/
│   ├── use-buzzer-realtime.ts
│   └── use-leaderboard.ts
├── lib/
│   ├── auth.ts             ← helpers requireUser / requireAdmin
│   ├── env.ts              ← validation env Zod + whitelist domaines
│   ├── utils.ts            ← cn()
│   └── supabase/
│       ├── client.ts       ← client navigateur
│       ├── server.ts       ← client serveur + service role
│       ├── middleware.ts   ← refresh session + garde admin
│       └── types.ts        ← types DB
├── middleware.ts           ← entrypoint Next.js middleware
└── ...
supabase/migrations/        ← scripts SQL à exécuter dans Supabase
```

### 2.2 Stratégie buzzer temps réel

**Le buzzer doit garantir un ordre équitable malgré la latence réseau variable des téléphones.**

Flow :

1. L'utilisateur clique sur le buzzer → le client appelle la RPC PostgreSQL `place_buzz(p_room_id)`.
2. La RPC s'exécute côté serveur (`SECURITY DEFINER`) :
   - identifie la manche active du salon ;
   - insère un buzz dans `public.buzzes` avec `buzzed_at = clock_timestamp()` (timestamp serveur autoritaire) ;
   - une contrainte `UNIQUE(round_id, user_id)` garantit qu'un même utilisateur ne peut avoir qu'un seul buzz par manche (les clics suivants sont silencieusement ignorés via `ON CONFLICT DO NOTHING`).
3. La table `buzzes` est publiée via **Supabase Realtime**. Tous les clients reçoivent l'INSERT.
4. Le hook `useBuzzerRealtime` reçoit l'événement, refait un `SELECT * FROM buzzes_ordered WHERE round_id = ...` (vue qui calcule `row_number() OVER (ORDER BY buzzed_at)` et joint les infos profil / équipe).
5. L'admin et les joueurs voient la liste mise à jour avec position, nom, équipe et timestamp.

**Pourquoi cette stratégie élimine les conflits de concurrence :**

- Pas de logique de tri côté client → impossible de tricher en antidatant.
- `clock_timestamp()` (vs `now()`) renvoie le moment exact d'exécution de la fonction, et non le moment de début de la transaction → plus précis pour départager des buzzes très proches.
- L'index `(round_id, buzzed_at)` rend l'ordre déterministe et rapide à requêter.
- Le `ON CONFLICT DO NOTHING` évite les re-buzzes parasites.

### 2.3 Sécurité (RLS)

- Toutes les tables ont RLS activée.
- Les opérations sensibles passent par des **RPC `SECURITY DEFINER`** qui valident `auth.uid()` et appliquent les règles métier (notamment `cast_vote` qui interdit de voter pour sa propre équipe).
- Le helper `public.is_admin()` est `SECURITY DEFINER` et `STABLE` pour éviter une récursion infinie dans les policies de la table `profiles`.

### 2.4 Storage

| Bucket | Public | Contenu | Écriture |
|---|---|---|---|
| `team-logos` | ✅ | Logos d'équipes | Admin |
| `photos` | ❌ | Photos d'événement | User (préfixe = uid), modération admin |
| `poll-choices` | ✅ | Visuels des choix de sondage | Admin |

Pour les photos privées, l'app génère des **URL signées (4h)** côté serveur via `createSignedUrl`.

---

## 3. Développement

### Scripts disponibles

```powershell
pnpm dev        # serveur dev (Turbopack)
pnpm build      # build de production
pnpm start      # serveur production (après build)
pnpm lint       # eslint
```

### Workflow recommandé

1. Activez `AUTH_BYPASS_OTP=true` localement pour itérer sans se faire envoyer un code à chaque connexion.
2. Créez plusieurs onglets/navigateurs en navigation privée pour simuler plusieurs joueurs.
3. Le bouton **Admin** apparaît dès que `is_admin = true` sur le profil.

---

## 4. Déploiement Vercel

1. Poussez le projet sur GitHub.
2. Sur https://vercel.com, **Add New → Project** et importez le repo.
3. Framework détecté automatiquement : **Next.js**.
4. Variables d'environnement à ajouter :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (uniquement si vous gardez bypass auth en prod, ce qui n'est PAS recommandé)
   - `ALLOWED_EMAIL_DOMAINS`
   - `AUTH_BYPASS_OTP=false`
5. **Deploy**.
6. Une fois déployé, ajoutez l'URL de prod dans **Supabase → Authentication → URL Configuration → Redirect URLs**.

---

## 5. Modèle de données

Voir `supabase/migrations/0001_init.sql` pour les détails. Vue d'ensemble :

```
auth.users ──1:1── profiles ───N:1── teams
                       │                │
                       │ N:1            │ 1:N
                       └──→ team_email_invites

quiz_rooms ──1:N── rounds ──1:N── buzzes
                                    └──N:1── profiles

photo_albums ──1:N── photos ──N:1── profiles (uploaded_by)

polls ──1:N── poll_choices ──N:1── teams (restricted_team_id)
   └──1:N── poll_votes ──N:1── profiles
                          └──N:1── poll_choices
```

Vues exposées :
- `leaderboard` : équipes triées par score
- `buzzes_ordered` : buzzes avec position + infos user/équipe
- `poll_results` : agrégat anonyme de votes par choix

---

## 6. Limitations connues / Pistes d'évolution

- Pas d'historique des points (un simple champ `score` sur `teams`). Pour audit, ajouter une table `score_events`.
- Pas de compression d'image côté client à l'upload — peut saturer le quota Supabase en cas d'usage intensif.
- Pas de PWA (manifest sans icônes ; ajouter des PNGs 192/512 dans `public/` si besoin).
- Pas de i18n.
