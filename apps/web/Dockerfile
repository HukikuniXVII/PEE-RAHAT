# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# apps/web — Next.js 14 (App Router) production image.
# Built from the repo root so pnpm can resolve workspace packages:
#   docker build -f apps/web/Dockerfile -t peerahat-web .
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine

# ─── base ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ─── deps: install full workspace deps from the lockfile ─────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ─── builder: build @peerahat/types then the web app ─────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
# packages/config has its own tailwindcss devDep — its preset.ts is
# imported by apps/web/tailwind.config.ts, and Next's typecheck follows
# that import. Without these node_modules, tsc can't resolve tailwindcss.
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY . .

# NEXT_PUBLIC_* values are baked into the client bundle at build time.
# Pass them with --build-arg from docker/compose so the browser code sees
# the right Supabase project + API URL.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED
ARG NEXT_PUBLIC_BOOKING_DAY_START_HOUR
ARG NEXT_PUBLIC_BOOKING_DAY_END_HOUR
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED=${NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED}
ENV NEXT_PUBLIC_BOOKING_DAY_START_HOUR=${NEXT_PUBLIC_BOOKING_DAY_START_HOUR}
ENV NEXT_PUBLIC_BOOKING_DAY_END_HOUR=${NEXT_PUBLIC_BOOKING_DAY_END_HOUR}

ENV NODE_ENV=production
RUN pnpm --filter @peerahat/types build
RUN pnpm --filter @peerahat/web build

# ─── runner: minimal runtime serving the standalone bundle ───────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# next.config.mjs sets `output: "standalone"` + `outputFileTracingRoot`
# to the repo root, so the standalone folder mirrors the monorepo layout:
#   .next/standalone/apps/web/server.js
#   .next/standalone/node_modules
#   .next/standalone/packages/*
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
