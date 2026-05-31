# Déploiement CAP Games sur Vercel

Tutoriel complet pour déployer l'app en production, en partant de zéro côté Supabase.

---

## Prérequis

- Compte [Vercel](https://vercel.com) (gratuit, plan Hobby suffit pour la soirée)
- Compte [Supabase](https://supabase.com) (gratuit, plan Free suffit)
- Repo GitHub avec ce projet
- Accès au DNS de votre domaine custom

---

## 1. Créer le projet Supabase

1. Sur https://supabase.com/dashboard → **New project**
2. Nom : `cap-games-prod`, région **Frankfurt (eu-central-1)** (latence FR)
3. Mot de passe DB fort → conservez-le (peu utilisé par la suite)
4. Attendez ~2 min que le projet soit provisionné

### Récupérer les clés

**Settings → API** (ou **Project Settings → API Keys** selon la version) :

| Variable Vercel | Champ Supabase |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (ex. `https://abcdefgh.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` (révélez-la) |

> ⚠️ La `service_role` est ultra-puissante. Ne la commitez **jamais**, ne la mettez **jamais** côté client.

### Appliquer les migrations SQL

Dans **SQL Editor → + New query**, exécutez **dans l'ordre** le contenu de chaque fichier :

1. `supabase/migrations/0001_init.sql` (tables + enums)
2. `supabase/migrations/0002_functions_and_triggers.sql` (RPC + trigger profile)
3. `supabase/migrations/0003_rls_policies.sql` (Row Level Security)
4. `supabase/migrations/0004_views_realtime_storage.sql` (vues, realtime, buckets)
5. `supabase/migrations/0005_design_system.sql` (colonnes couleur/short/buzzer_style)

> ⚠️ **Les migrations 0001 → 0004 sont destructives** : elles font `drop table cascade` / `drop function` / `drop policy` au début pour pouvoir être ré-exécutées proprement. **Toutes les données existantes (équipes, photos, sondages, comptes utilisateurs) sont effacées** à chaque réexécution. La 0005 est idempotente non-destructive (préserve les données équipes).
>
> Les buckets storage et leurs fichiers sont conservés (la 0004 ne touche qu'aux policies et aux vues).

Vérifiez ensuite dans **Database → Tables** que `teams`, `profiles`, `quiz_rooms`, `polls`, etc. existent.

### Configurer l'auth OTP

**Authentication → Sign-in / Providers** :
- Activez **Email**
- Décochez **Enable email confirmations** (l'OTP suffit, pas besoin de double vérif)
- Onglet **Settings** → **Email OTP Expiration** : 3600s (1h)
- **Email OTP Length** : 6

**Authentication → URL Configuration** :
- **Site URL** : `https://cap-games.votre-domaine.com` (votre domaine final — voir étape 4)
- **Redirect URLs** : ajoutez :
  - `https://cap-games.votre-domaine.com/**`
  - `https://*.vercel.app/**` (pour les preview deployments)
  - `http://localhost:3000/**` (pour le dev)

### Créer le premier admin

Une fois l'app déployée et que vous vous êtes connecté **une fois** (votre profil sera créé automatiquement), retournez dans **SQL Editor** et exécutez :

```sql
update public.profiles set is_admin = true where email = 'votre.email@capvision.fr';
```

---

## 2. Connecter le repo à Vercel

1. https://vercel.com/new → **Import Git Repository**
2. Sélectionnez le repo CAP Games
3. Framework Preset : **Next.js** (auto-détecté)
4. **N'ouvrez PAS encore "Deploy"** — d'abord configurer les variables

### Variables d'environnement

**Environment Variables** (collez ces 5, scope **Production, Preview, Development**) :

```
NEXT_PUBLIC_SUPABASE_URL       = https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon key>
SUPABASE_SERVICE_ROLE_KEY      = <service_role key>
ALLOWED_EMAIL_DOMAINS          = capvision.fr,capgemini.com
AUTH_BYPASS_OTP                = false
```

> Adaptez `ALLOWED_EMAIL_DOMAINS` à la liste exacte des domaines pro autorisés (séparés par virgule, sans espaces).

5. Cliquez **Deploy** → premier build (~2 min)

---

## 3. Domaine custom

1. Sur le projet Vercel → **Settings → Domains** → **Add**
2. Saisissez `cap-games.votre-domaine.com` → **Add**
3. Vercel affiche les enregistrements DNS à créer

### Côté votre registrar DNS

Ajoutez **un** des deux :

**Option A — sous-domaine (recommandé)**

| Type | Nom | Valeur |
|---|---|---|
| `CNAME` | `cap-games` | `cname.vercel-dns.com.` |

**Option B — domaine apex (`votre-domaine.com` directement)**

| Type | Nom | Valeur |
|---|---|---|
| `A` | `@` | `76.76.21.21` |

Propagation DNS : 5 min à 24h selon le registrar (souvent <30 min).

Une fois validé par Vercel, **retournez sur Supabase** :
- **Authentication → URL Configuration → Site URL** : mettez bien `https://cap-games.votre-domaine.com`
- Ajoutez `https://cap-games.votre-domaine.com/**` dans les Redirect URLs si ce n'était pas fait

---

## 4. Vérifier que tout marche

1. Ouvrez `https://cap-games.votre-domaine.com/login`
2. Saisissez un email du domaine autorisé
3. Recevez le code à 6 chiffres par mail → saisissez-le → vous arrivez sur `/classement`
4. Vous voyez l'encart "Tu n'as pas encore d'équipe" → normal, l'admin doit vous affecter
5. Dans Supabase SQL Editor, promouvez-vous admin (cf. étape 1)
6. Recharger → l'onglet **Admin** apparaît dans la tabbar
7. **Admin → Équipes** → créez une équipe, ajoutez-vous via "Pré-inscrire" puis vous réaffectez
8. Reconnectez-vous (ou attendez le refresh session) → tabs Buzzer/Sondages débloqués

---

## 5. Maintenance & dépannage

### Re-déployer après push

Chaque push sur la branche `main` déclenche automatiquement un nouveau build de production. Les PR créent des previews jetables.

### Logs

- **Vercel** : onglet **Logs** du projet → live tail des erreurs serveur
- **Supabase** : **Logs Explorer** → filtrer par `auth`, `postgres`, `api`

### Erreurs fréquentes

| Symptôme | Cause | Solution |
|---|---|---|
| `getaddrinfo ENOTFOUND example.supabase.co` | Vars d'env non chargées (cache) | Vercel → Redeploy ; en local supprimer `.next/` |
| OTP n'arrive pas | Limite mail Supabase Free | Configurer un SMTP custom dans **Authentication → SMTP** |
| Photos invisibles | Storage policies non appliquées | Re-exécuter `0004_views_realtime_storage.sql` |
| Tabs locked malgré équipe | Session stale | Cliquer Logout puis Login |
| Build Vercel échoue avec "pnpm not found" | `packageManager` mal défini | Vérifier `package.json` → `"packageManager": "pnpm@11.2.2"` |

### Rotation des clés Supabase

Si la `service_role` est compromise : **Supabase Settings → API → Reset service_role**, puis mettez à jour la variable Vercel et redéployez.

---

## 6. Avant la soirée — checklist

- [ ] Migrations 0001 → 0005 exécutées en prod
- [ ] Variables d'env Vercel renseignées (les 5, en Production)
- [ ] `AUTH_BYPASS_OTP=false`
- [ ] Domaine custom actif (HTTPS vert)
- [ ] Site URL Supabase = domaine custom
- [ ] Email SMTP custom configuré (sinon ratés OTP sur >4 mails/h)
- [ ] Premier admin promu en base
- [ ] Équipes pré-créées avec emails des invités pré-inscrits
- [ ] Au moins un salon de quizz créé en `draft`
- [ ] Test bout-en-bout : un téléphone non admin se connecte, voit son équipe, peut buzzer, voter, uploader une photo

Bonne soirée ! 🎉
