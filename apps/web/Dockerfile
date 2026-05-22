# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# apps/web — Next.js 14 (App Router) production image.
#
# Build from the repo root so pnpm can resolve workspace packages:
#   docker build -f apps/web/Dockerfile -t peerahat-web .
#
# Optimized for fast rebuilds on a durable BuildKit builder:
#   • manifests stage   → install layers survive every source-only edit
#   • --filter web...    → the api's Nest / Prisma / AWS-SDK tree is never installed
#   • pnpm store mount   → a warm install is little more than hardlinking
#   • .next/cache mount  → every build after the first is incremental
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.12.0

# ─── base ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ─── manifests: only the files that drive dependency resolution ──────────────
# Isolating these means every install layer below is reused until a
# package.json / the lockfile / the workspace config actually changes —
# ordinary source edits never invalidate the (expensive) install.
FROM base AS manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json        ./apps/api/
COPY apps/web/package.json        ./apps/web/
COPY packages/types/package.json  ./packages/types/
COPY packages/ui/package.json     ./packages/ui/
COPY packages/config/package.json ./packages/config/

# ─── deps: deps for the web subtree only ─────────────────────────────────────
# `--filter @peerahat/web...` installs web + its transitive workspace deps
# (@peerahat/ui, @peerahat/types, @peerahat/config) and nothing else — the
# api's Nest / Prisma / AWS-SDK / googleapis tree is skipped entirely. The
# shared store cache mount makes a warm install little more than hardlinking.
FROM manifests AS deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @peerahat/web...

# ─── builder: build @peerahat/types, then the web app ────────────────────────
FROM base AS builder
# Workspace manifests + the installed dependency tree from `deps`.
COPY --from=deps /app/ ./
# The full source. node_modules is .dockerignore'd, so this never clobbers
# the installed deps. Kept ABOVE the build args so changing a NEXT_PUBLIC_*
# value invalidates only the build layer, not this copy.
COPY . .

# NEXT_PUBLIC_* values are baked into the client bundle at build time.
# Pass them with --build-arg from docker/compose so the browser code sees
# the right Supabase project + API URL.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED
ARG NEXT_PUBLIC_BOOKING_DAY_START_HOUR
ARG NEXT_PUBLIC_BOOKING_DAY_END_HOUR
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED=${NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED} \
    NEXT_PUBLIC_BOOKING_DAY_START_HOUR=${NEXT_PUBLIC_BOOKING_DAY_START_HOUR} \
    NEXT_PUBLIC_BOOKING_DAY_END_HOUR=${NEXT_PUBLIC_BOOKING_DAY_END_HOUR}
ENV NODE_ENV=production

# .next/cache holds Next's SWC-transform + webpack module cache; a BuildKit
# cache mount turns every build after the first into an incremental one.
# The mount is NOT part of any image layer — only .next/standalone and
# .next/static (real files written alongside it) are copied into the runner.
# In CI this mount is persisted across runs by buildkit-cache-dance (see
# .github/workflows/publish-images.yml); its id is intentionally left at the
# default (= the target path) so the dance can address it by target.
RUN --mount=type=cache,target=/app/apps/web/.next/cache \
    pnpm --filter @peerahat/types build \
 && pnpm --filter @peerahat/web build

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
