# Deploy guide — Pee Rahat

Production runs on a **self-hosted VPS** (`103.253.72.189`) fronted by **Cloudflare Tunnel**. GitHub Actions builds Docker images, pushes them to **ghcr.io**, then the VPS pulls and runs them. No inbound ports are exposed — Cloudflare Tunnel handles public HTTPS.

Live at: **https://peerahat.com**

---

## Architecture

```
Internet ──► Cloudflare Edge (TLS) ──► cloudflared tunnel ──► VPS
                                                                ├── web:3000  (Next.js)
                                                                ├── api:3001  (NestJS + Prisma)
                                                                └── redis:6379 (BullMQ)

DB:      VPS host PostgreSQL (port 5432, not containerised)
Storage: External MinIO at minio-api.zsh.ltd (S3-compatible)
Auth:    Supabase (JWT identity only — DB is on VPS)
```

- **ghcr.io** hosts two images: `peerahat-api` and `peerahat-web`
- **docker-compose.prod.yml** + **.env.production** define the stack
- The API container runs `prisma migrate deploy` automatically on every boot

---

## CI — image builds

`.github/workflows/publish-images.yml` runs on every push to `main`:

1. Builds `api` and `web` images in parallel
2. Pushes both `:latest` and `:<sha>` tags to `ghcr.io/hukikunixvii/`
3. `NEXT_PUBLIC_*` env vars are baked into the web image as build-args at CI time

The VPS uses `:latest` by default (`pull_policy: always`), so `docker compose up -d` on the VPS always pulls the newest build.

---

## First deploy (new VPS)

### 1. Prerequisites on the VPS

- Docker + Docker Compose v2 installed (rootless optional)
- PostgreSQL running on the host (port 5432) with the `hubtiw_db` database and user
- `cloudflared` Tunnel token obtained from Cloudflare Zero Trust dashboard

### 2. Copy files to the VPS

```bash
scp docker-compose.prod.yml user@103.253.72.189:~/peerahat/
scp .env.production         user@103.253.72.189:~/peerahat/
```

`.env.production` is git-ignored — never commit it. Ask the project owner for a copy.

### 3. Authenticate Docker to ghcr.io (if packages are private)

```bash
# On the VPS
echo "<your-github-pat>" | docker login ghcr.io -u <github-username> --password-stdin
```

A PAT with `read:packages` scope is enough.

### 4. Provision MinIO buckets (one-time)

```bash
cd ~/peerahat
docker compose --env-file .env.production -f docker-compose.prod.yml \
  --profile setup run --rm minio-init
```

This creates `peerahat-kyc`, `peerahat-sheets`, `peerahat-kyc-archive`, and `peerahat-avatars`; makes `peerahat-avatars` publicly readable. Safe to re-run — idempotent.

### 5. Start the stack

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

On first boot the API runs `prisma migrate deploy`, creating the full schema, then starts listening. Subsequent boots apply only pending migrations.

### 6. Configure Cloudflare Tunnel routing

In the Cloudflare Zero Trust dashboard (for the tunnel whose token is in `.env.production`):

| Hostname | Path | Service |
|---|---|---|
| `peerahat.com` | `/api/*` | `http://api:3001` |
| `peerahat.com` | `/*` | `http://web:3000` |

No ports need to be opened on the VPS firewall — cloudflared makes only outbound connections to Cloudflare's edge.

---

## Redeploy (ship a new build)

CI runs automatically on every push to `main` and publishes new `:latest` images. To pull and restart on the VPS:

```bash
ssh user@103.253.72.189
cd ~/peerahat
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

`pull_policy: always` in `docker-compose.prod.yml` means `up -d` re-pulls `:latest` for api + web, then restarts changed containers. Redis is unaffected unless the image version changed.

### Pin to a specific SHA (optional)

Update `API_IMAGE` and `WEB_IMAGE` in `.env.production` to a `:<sha>` tag printed in CI logs, then re-run `up -d`.

---

## Run DB migrations manually

The API runs migrations on boot, but if you need to run them from your laptop against prod:

```powershell
# Point directly at the VPS Postgres (bypass PgBouncer — needed for migrations)
$env:DATABASE_URL = "postgresql://hubtiw_dbau:<password>@103.253.72.189:5432/hubtiw_db?schema=public"
pnpm --filter @peerahat/api exec npx prisma migrate deploy
```

Never run `prisma migrate dev` against prod — it rewrites migration history.

---

## Logs and diagnostics

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# One service
docker compose -f docker-compose.prod.yml logs -f api

# API health (no auth)
curl https://peerahat.com/api/tcas/deadlines

# OpenAPI docs
open https://peerahat.com/api/docs
```

---

## Day-2 ops cheatsheet

| Task | Command |
|---|---|
| Ship new code | `git push` → CI builds → `ssh` + `up -d` on VPS |
| Roll back | Set `API_IMAGE`/`WEB_IMAGE` to prior `:<sha>` in `.env.production`, then `up -d` |
| Stop the stack | `docker compose -f docker-compose.prod.yml down` |
| Wipe Redis data | `docker compose -f docker-compose.prod.yml down -v` (loses BullMQ state) |
| Tail a container | `docker logs -f peerahat-api` |
| Promote user to admin | `pnpm --filter @peerahat/api run promote-admin <email>` (from laptop, pointing at prod DB) |
| Rotate Redis password | Update `REDIS_PASSWORD` + `REDIS_URL` in `.env.production`, restart stack |
| Re-provision MinIO buckets | Re-run the `minio-init` one-shot from Step 4 |

---

## Environment variables reference

The full env var list lives in `.env.production` (git-ignored) and `.env.example` (checked in with safe defaults). Key groups:

| Group | Vars |
|---|---|
| Images | `API_IMAGE`, `WEB_IMAGE` |
| API runtime | `NODE_ENV`, `PORT`, `WEB_ORIGIN` |
| Database | `DATABASE_URL` |
| Redis | `REDIS_PASSWORD`, `REDIS_URL` |
| Supabase (auth only) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` |
| Object storage | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_*`, `S3_AVATAR_PUBLIC_BASE_URL` |
| Payments | `ZERCLE_SLIP_ENABLED`, `PROMPTPAY_MERCHANT_ID`, `PLATFORM_COMMISSION_PCT`, `WITHHOLDING_TAX_PCT` |
| Google OAuth | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `GOOGLE_OAUTH_STATE_JWT_SECRET` |
| Gemini AI | `GEMINI_API_KEY`, `GEMINI_PRIMARY_MODEL`, `TCAS_AI_IMPORT_ENABLED` |
| Web push | `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` |
| Cloudflare Tunnel | `CLOUDFLARE_TUNNEL_TOKEN` |
