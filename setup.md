# Local Setup

From the repo root (`F:\DEV\PEERAHAT`):

```powershell
# 1. Start infra (Postgres, Redis, MinIO) — runs in background
docker compose up -d

# 2. Install deps (first time only, or after pulls that change package.json)
pnpm install

# 3. Apply DB migrations + generate Prisma client (first time, or after schema changes)
pnpm --filter @peerahat/api prisma:migrate
pnpm --filter @peerahat/api prisma:generate

# 4. Seed test data (first time, or to reset)
pnpm --filter @peerahat/api prisma:seed

# 5. Start everything (types watch + api on :3001 + web on :3000)
pnpm dev
```

Then open http://localhost:3000.

## Day-to-day

After first setup, just two commands:

```powershell
docker compose up -d
pnpm dev
```

## Useful URLs

- Web: http://localhost:3000
- API: http://localhost:3001/api
- API docs (Swagger): http://localhost:3001/api/docs
- MinIO console: http://localhost:9001 (user `minioadmin` / pass `minioadmin`)
- Postgres: `localhost:5432` db `peerahat`

## Stop everything

- `Ctrl+C` in the `pnpm dev` terminal
- `docker compose down` (add `-v` to wipe the DB volume)

## Known gotchas

- If `pnpm dev` errors with `EADDRINUSE :3001` after a hot-reload, kill the stuck node listener and re-run `pnpm dev:api`.
- After nuking the MinIO volume, the `avatars/*` public-read policy needs to be re-applied manually.
- Object storage falls back to a `https://storage.local` stub when `S3_*` env vars are unset — that's expected in dev.

## Fully offline?

Supabase auth still hits the cloud (`fuuvxzgeugrkxycyalxc.supabase.co`), so login won't work without internet. Everything else (API, DB, sheet storage, MinIO) is local.

## Test accounts

Created via `apps/api/scripts/link-test-auth-users.ts` (re-runnable):

| Role    | Email                       | Password    |
|---------|-----------------------------|-------------|
| Student | ning.test@peerahat.local    | Test1234!   |
| Tutor   | nut.test@peerahat.local     | Test1234!   |

To re-create / re-link:

```powershell
pnpm --filter @peerahat/api exec tsx --env-file=.env scripts/link-test-auth-users.ts
```
