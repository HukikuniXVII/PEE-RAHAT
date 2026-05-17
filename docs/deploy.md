# Deploy guide — Pee Rahat (Phase 1)

End-to-end walkthrough for the PaaS-split shape. ~30–60 min if you don't
get stuck.

## Target

| Piece | Host | Plan | URL shape |
|---|---|---|---|
| Web (Next.js 14) | **Vercel** | Free / Hobby | `https://<project>.vercel.app` |
| API (NestJS + workers) | **Railway** | $5 trial credit then ~$5/mo | `https://<service>.up.railway.app` |
| Postgres | **Supabase Postgres** (your existing project) | Free (500 MB) | (internal) |
| Redis | **Upstash** | Free (10k cmds/day) | `rediss://...` |
| Storage (KYC + sheets) | **Cloudflare R2** | ~free at low traffic | S3-compatible |
| Auth | **Supabase Auth** (already wired) | Free | `<ref>.supabase.co` |

Expected monthly cost at launch: **~$5–10**. Mostly Railway for the
long-running API process; everything else stays in free tiers until
traffic grows.

## Prereqs

- GitHub repo pushed to (already done — `github.com/HukikuniXVII/PEE-RAHAT`).
- Working local `pnpm dev` (already confirmed).
- Accounts (free, ~2 min each):
  - https://vercel.com (sign in with GitHub)
  - https://railway.app (sign in with GitHub)
  - https://upstash.com (sign in with GitHub)
  - https://dash.cloudflare.com (email signup)
- Your existing Supabase project (`fuuvxzgeugrkxycyalxc`).
- Your existing Google Cloud OAuth client.

---

## Step 1 — Supabase Postgres (DB)

Already provisioned with your Supabase project. Just grab the connection string.

1. Supabase Dashboard → Project Settings → **Database**.
2. Find the **Connection string** → URI mode. Two variants are listed:
   - **Transaction pooler** (port 6543) — good for serverless. Use this
     for the **`DATABASE_URL`** the API reads at runtime.
   - **Direct connection** (port 5432) — needed for migrations
     (Prisma can't run migrations through PgBouncer's transaction mode).
3. Copy both. They'll look like:
   - Pooler: `postgresql://postgres.<ref>:<pwd>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
   - Direct: `postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres`
4. Reveal the **database password** (Reset if you don't have it saved).

Save both strings — you'll paste them into Railway and one local run.

> **Don't run `prisma migrate dev` against prod.** It tries to detect
> drift and rewrites the migration history. Use `prisma migrate deploy`
> from your laptop pointing at the **direct connection** string.

---

## Step 2 — Upstash Redis

1. https://console.upstash.com → **Create Database**.
2. Name: `peerahat-prod`. Region: **AP Southeast 1** (Singapore) — same
   region as Supabase for low latency.
3. Type: **Regional** (not Global — cheaper, fine for one-region launch).
4. TLS: **Enabled** (default).
5. After create, open **Details** → copy the **Redis URL** (the
   `rediss://` one, NOT the REST API URL). Save as `REDIS_URL`.

> BullMQ needs the TCP connection (`rediss://`), not Upstash's HTTP
> REST endpoint. The `ioredis` driver the API uses speaks TCP.

---

## Step 3 — Cloudflare R2 buckets

R2 is S3-compatible and has $0 egress, which matters for KYC photos
and PDF downloads.

1. Cloudflare dashboard → **R2** → **Create bucket** three times:
   - `peerahat-kyc`
   - `peerahat-sheets`
   - `peerahat-kyc-archive`
2. R2 → **Manage R2 API Tokens** → **Create API token**:
   - Permissions: **Object Read & Write**
   - Specify buckets: the three above
   - TTL: forever (or rotate per your policy)
3. Copy the **Access Key ID** and **Secret Access Key**.
4. The R2 endpoint URL is `https://<account-id>.r2.cloudflarestorage.com`
   (account ID is at the top right of the R2 dashboard).

Env vars you'll set on Railway:

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<from step 3>
S3_SECRET_ACCESS_KEY=<from step 3>
S3_BUCKET_KYC=peerahat-kyc
S3_BUCKET_SHEETS=peerahat-sheets
S3_BUCKET_KYC_ARCHIVE=peerahat-kyc-archive
```

> Avatars on `/users` go through the same signer. If you want them
> public-cached via R2's public bucket feature, you can split out a
> fourth `peerahat-avatars` bucket later. The KYC bucket should stay
> private always (PDPA — NFR-03).

---

## Step 4 — Deploy API to Railway

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** →
   pick `HukikuniXVII/PEE-RAHAT`.
2. Railway scans the repo. It'll see the pnpm-workspace + turbo setup.
   Configure the service:
   - **Root Directory**: leave empty (workspace root).
   - **Build command**: `pnpm install --frozen-lockfile && pnpm --filter @peerahat/types build && pnpm --filter @peerahat/api build`
   - **Start command**: `node apps/api/dist/main.js`
   - **Watch paths**: `apps/api/**`, `packages/types/**`, `packages/config/**`
3. **Variables** tab — paste in every env var. Group them so you don't
   miss any. Use the values from Steps 1–3 plus your existing Google
   OAuth + Supabase keys + payment knobs:

```
PORT=3001
WEB_ORIGIN=https://<placeholder-set-after-vercel-deploy>.vercel.app
DATABASE_URL=<pooler URL from Step 1>
REDIS_URL=<rediss:// URL from Step 2>

# Supabase
SUPABASE_URL=https://fuuvxzgeugrkxycyalxc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Supabase > Settings > API > service_role key>
SUPABASE_JWT_SECRET=<Supabase > Settings > API > JWT Secret>

# S3 / R2
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET_KYC=peerahat-kyc
S3_BUCKET_KYC_ARCHIVE=peerahat-kyc-archive
S3_BUCKET_SHEETS=peerahat-sheets
S3_ACCESS_KEY_ID=<from Step 3>
S3_SECRET_ACCESS_KEY=<from Step 3>

# Payments — keep ZercleSlip off for launch unless you have credentials
ZERCLE_SLIP_ENABLED=false
ZERCLE_PLATFORM_ACCOUNT_NUMBER=<your account>
PROMPTPAY_MERCHANT_ID=<your merchant id>
PLATFORM_COMMISSION_PCT=10
WITHHOLDING_TAX_PCT=3
POSTPONE_TUTOR_CUT_SHORT_NOTICE=50
POSTPONE_PLATFORM_FEE_SHORT_NOTICE=10

# Workers — must be true so cron + BullMQ run
JOBS_ENABLED=true

# Google OAuth (per-tutor Meet, FR-TH-17)
GOOGLE_OAUTH_CLIENT_ID=<from your existing client>
GOOGLE_OAUTH_CLIENT_SECRET=<from your existing client>
GOOGLE_OAUTH_REDIRECT_URI=https://<railway-service>.up.railway.app/api/auth/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=<base64 32-byte — generate fresh, see docs/google-oauth-setup.md>
GOOGLE_OAUTH_STATE_JWT_SECRET=<base64 48-byte — generate fresh>
```

4. **Deploy**. First build takes ~3–5 min. Watch logs for
   `Pee Rahat API listening on http://0.0.0.0:3001/api`.
5. **Networking** tab → **Generate Domain**. Copy the
   `<service>.up.railway.app` URL. This is your API base.
6. Update `GOOGLE_OAUTH_REDIRECT_URI` env var to use the real Railway URL
   you just got (it was a placeholder). Redeploy.

> The build command runs `pnpm --filter @peerahat/types build` first
> because `@peerahat/api` imports compiled output from it. Without that
> prebuild, Railway's container won't find the `dist/index.js`.

---

## Step 5 — Run migrations against prod DB

From your laptop (one-time, then any time you ship a new migration):

```powershell
$env:DATABASE_URL="<DIRECT connection string from Step 1, port 5432>"
pnpm --filter @peerahat/api prisma:migrate-deploy
```

`prisma migrate deploy` only runs pending migrations — it never edits
existing ones — so it's safe in prod.

If the script name doesn't exist in `apps/api/package.json` yet, run
it directly:

```powershell
cd apps/api
$env:DATABASE_URL="<direct url>"
npx prisma migrate deploy
```

You should see something like
`X migrations have been successfully applied`.

Don't run the seed against prod (`prisma:seed` is dev test data).

---

## Step 6 — Deploy web to Vercel

1. https://vercel.com/new → import `HukikuniXVII/PEE-RAHAT`.
2. **Framework Preset**: Next.js (detected).
3. **Root Directory**: `apps/web`.
4. **Build Command**: leave the auto-detected `next build`. Vercel
   handles pnpm + turbo monorepo transitively (it'll `pnpm install` at
   the workspace root and run the build in `apps/web`).
5. **Output Directory**: `.next` (default).
6. **Environment Variables**:

```
NEXT_PUBLIC_API_BASE_URL=https://<service>.up.railway.app/api
NEXT_PUBLIC_SUPABASE_URL=https://fuuvxzgeugrkxycyalxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase > Settings > API > anon public key>
NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED=true
NEXT_PUBLIC_BOOKING_DAY_START_HOUR=9
NEXT_PUBLIC_BOOKING_DAY_END_HOUR=21
```

7. **Deploy**. First build takes ~2–4 min.
8. Vercel gives you `https://<project>.vercel.app`. Copy this URL.

---

## Step 7 — Wire CORS + callbacks across services

Three places need the production URLs added.

### 7a. Railway `WEB_ORIGIN`

Go back to Railway → Variables → update `WEB_ORIGIN` to your Vercel URL
(`https://<project>.vercel.app`, no trailing slash). The API reads
this in `main.ts` for CORS — without it, browser requests get blocked.
Redeploy after saving.

### 7b. Supabase Auth — URL Configuration

Supabase Dashboard → Authentication → **URL Configuration**:

- **Site URL**: `https://<project>.vercel.app`
- **Additional Redirect URLs**: add both
  - `https://<project>.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (keep dev working too)

Save.

### 7c. Google Cloud OAuth client

The single client you set up earlier needs the production redirect
URIs added.

1. https://console.cloud.google.com/apis/credentials → open your OAuth
   client (`896968600723-nt36opura...`).
2. **Authorized JavaScript origins** — add `https://<project>.vercel.app`.
3. **Authorized redirect URIs** — make sure these are all listed:
   - `http://localhost:3001/api/auth/google/callback` (dev Meet flow)
   - `https://<service>.up.railway.app/api/auth/google/callback` (prod Meet flow — FR-TH-17)
   - `https://fuuvxzgeugrkxycyalxc.supabase.co/auth/v1/callback` (Supabase social login — both dev and prod use this since Supabase is a single hosted project)
4. Save.

---

## Step 8 — Verify

End-to-end smoke test against the deployed URLs.

1. Open `https://<project>.vercel.app`.
2. **Sign-up** with an email and confirm the verification mail.
3. **Sign in with Google** — should bounce through consent → Supabase →
   land back on `/` signed in.
4. Browse to `/tutors` — should load tutors from the API. If it 500s
   with `ECONNREFUSED`, the API service is down on Railway; check logs.
5. Open Network tab on a tutor profile — the `GET /api/tutors/:id` call
   should hit `https://<service>.up.railway.app/api/tutors/:id` and
   return 200. CORS preflight should also be 200.
6. **API health**: `curl https://<service>.up.railway.app/api/tcas/deadlines`
   should return JSON (no auth needed).
7. **Workers running**: Railway logs show
   `BullMQ workers registered` near startup (or no errors about
   Redis), and the daily `release-for-payout` cron registers itself.
8. Run `pnpm --filter @peerahat/api openapi:export` locally to confirm
   no regressions in the API surface; the doc is at
   `https://<service>.up.railway.app/api/docs`.

---

## Day-2 ops cheatsheet

| Task | Command / location |
|---|---|
| Push new code | `git push` — both Vercel and Railway redeploy on `main` push automatically |
| Run a new migration in prod | `prisma migrate deploy` from your laptop with the prod direct-connect URL |
| Tail API logs | Railway dashboard → service → **Deploy logs** / **Service logs** |
| Tail web logs | Vercel dashboard → project → **Logs** |
| Roll back a bad API deploy | Railway → deploy history → click an older one → **Redeploy** |
| Roll back web | Vercel → Deployments → **Promote to Production** on an earlier one |
| Bring API down (e.g. for maintenance) | Railway → service → **Settings** → **Deactivate** |
| Reset prod DB password | Supabase → Settings → Database → Reset password → update Railway `DATABASE_URL` |

---

## When you outgrow this shape

- **Postgres > 500 MB**: Supabase Pro is $25/mo and bumps the limit to
  8 GB + daily backups. Or move to Neon ($0 to start, branch databases).
- **Upstash > 10k cmds/day**: Pay-as-you-go ~$0.20 / 100k cmds. Or run
  Redis on Railway as a separate service.
- **Want a custom domain**: Vercel and Railway both have one-click
  custom-domain setup once you buy one (Cloudflare Registrar ~$10/yr is
  the cheapest path). Update `WEB_ORIGIN`, Supabase URL config, and
  Google OAuth redirect URIs after switching.
- **Need staging**: duplicate the Vercel project (free) + Railway
  service (~$5/mo more) pointing at a second Supabase project. Same
  steps as above.
