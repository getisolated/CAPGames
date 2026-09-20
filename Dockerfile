# syntax=docker/dockerfile:1.7
# =============================================================================
# CAP Games — image Next.js autonome (output: "standalone")
#
# Les variables NEXT_PUBLIC_* sont figées dans le bundle client au moment du
# build : elles doivent être passées en --build-arg (voir .github/workflows).
# Les autres variables (ALLOWED_EMAIL_DOMAINS, SUPABASE_SERVICE_ROLE_KEY…)
# sont lues à l'exécution via l'environnement du conteneur.
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- deps -------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
# Valeur de build uniquement : src/lib/env.ts valide l'env au chargement du
# module pendant le prerender. La vraie valeur vient du conteneur au runtime.
ENV ALLOWED_EMAIL_DOMAINS=build-placeholder.invalid
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/login || exit 1

CMD ["node", "server.js"]
