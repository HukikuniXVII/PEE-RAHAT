# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# apps/api — NestJS + Prisma production image.
#
# Build from the repo root so pnpm can resolve workspace packages:
#   docker build -f apps/api/Dockerfile -t peerahat-api .
#
# Optimized for fast rebuilds on a durable BuildKit builder:
#   • manifests stage   → install layers survive every source-only edit
#   • --filter api...    → the entire web / Next dependency tree is never installed
#   • pnpm store mount   → a warm install is little more than hardlinking
#   • schema-scoped copy → `prisma generate` is cached unless schema.prisma changes
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.12.0

# ─── base ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
# libc6-compat + openssl: Prisma's query engine needs both on Alpine.
RUN apk add --no-cache libc6-compat openssl \
 && corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

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

# ─── deps: dev+prod deps for the API subtree only ────────────────────────────
# `--filter @peerahat/api...` installs api + its transitive workspace deps
# (@peerahat/types, plus @peerahat/config from devDeps) and nothing else —
# the whole Next / React / lucide / motion tree is skipped. The shared store
# cache mount makes a warm install little more than hardlinking from disk.
FROM manifests AS deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @peerahat/api...

# ─── builder: prisma generate → build @peerahat/types → build @peerahat/api ──
FROM base AS builder
ENV NODE_ENV=production
# Workspace manifests + the installed dependency tree from `deps`.
COPY --from=deps /app/ ./
# The Prisma client is a pure function of the schema — copy ONLY the schema
# first so the generate layer stays cached across source-only edits. (Both
# node_modules and prisma/ are .dockerignore-safe: the later `COPY . .`
# never clobbers installed deps, and re-copies an identical prisma/ dir.)
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @peerahat/api exec prisma generate
# The rest of the source, then build @peerahat/types (tsc) and the API
# (nest build). These share one layer: a source edit reruns both anyway.
COPY . .
RUN pnpm --filter @peerahat/types build \
 && pnpm --filter @peerahat/api build

# ─── prod-deps: install ONLY the API subtree's production deps ───────────────
# `--prod` skips devDeps; `--filter @peerahat/api...` keeps api + its
# transitive workspace deps and drops everything web-only. Combined, this
# strips Next, lucide, the nest/tsc toolchain, both TypeScript installs —
# roughly 500 MB lighter than a naive install. Branching off `manifests`
# reuses those COPY layers instead of repeating them.
FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile --filter @peerahat/api...

# ─── runner: slim runtime ────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache libc6-compat openssl tini
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nestjs

# Prod-only node_modules from prod-deps (no devDeps, no web stack).
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /app/packages/types/node_modules ./packages/types/node_modules

# Built artifacts + Prisma schema for runtime migrations.
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./

# The builder's generated Prisma client lives at a pnpm path keyed by the
# full peer set; the prod-deps install has a different peer set, so the
# generated files don't carry over. Regenerate against the prod layout —
# fast (~5s) and bulletproof.
RUN cd apps/api \
 && node_modules/.bin/prisma generate --schema prisma/schema.prisma \
 # Strip Prisma engine variants we never use. node:20-alpine ships
 # OpenSSL 3, so the legacy `linux-musl` (OpenSSL 1.x) query + schema
 # engines are dead weight — bundled by @prisma/engines regardless of
 # binaryTargets. Saves ~33 MB.
 && find /app/node_modules -type f \
      \( -name 'libquery_engine-linux-musl.so.node' \
      -o -name 'schema-engine-linux-musl' \) \
      -not -name '*openssl*' -delete \
 && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001

# tini reaps zombies + forwards SIGTERM cleanly so Nest's shutdown hooks
# (enableShutdownHooks in main.ts) actually fire on `docker stop`.
ENTRYPOINT ["/sbin/tini", "--"]
# Nest CLI preserves `sourceRoot: "src"` from nest-cli.json, so main.ts
# compiles to dist/src/main.js (not dist/main.js — package.json's `start`
# script is wrong about this, but it's unused in the container path).
CMD ["node", "apps/api/dist/src/main.js"]
