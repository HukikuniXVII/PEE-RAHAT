# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# apps/api — NestJS + Prisma production image.
# Built from the repo root so pnpm can resolve workspace packages:
#   docker build -f apps/api/Dockerfile -t peerahat-api .
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine

# ─── base ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
# libc6-compat + openssl: Prisma's query engine needs both on Alpine.
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ─── deps: full workspace install (dev + prod) used only for the build ───────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ─── builder: prisma generate + build @peerahat/types + build api ────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm --filter @peerahat/api exec prisma generate
RUN pnpm --filter @peerahat/types build
RUN pnpm --filter @peerahat/api build

# ─── prod-deps: install ONLY the api subtree's production deps ───────────────
# `--filter @peerahat/api...` keeps api + its transitive workspace deps
# (only @peerahat/types in this graph) and drops everything web-only.
# `--prod` skips devDeps. Combined, this strips Next, lucide, turbo CLI,
# both TypeScript installs, etc. — roughly 500 MB of the previous image.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
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
