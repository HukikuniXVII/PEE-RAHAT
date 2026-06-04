# Pee Rahat

Verified EdTech marketplace connecting Thai high-school students preparing for **TCAS** with university-student tutors. Four pillars — Tutor Hub, Sheet Marketplace, TCAS Calculator, Community — unified by escrow-based payments.

See [`requirements.md`](./requirements.md) for the full product spec.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL via Prisma (Supabase) |
| Auth | Supabase Auth (JWT validated by NestJS via JWKS) |
| Storage | S3-compatible (Cloudflare R2 in prod, MinIO in dev) for KYC + sheets |
| Cache / Queues | Redis + BullMQ |
| Payments | Manual PromptPay + ZercleSlip verification API; admin-confirmed payouts (auto-gateway is off-roadmap — see requirements.md §4.5) |
| Real-time | SSE (`GET /notifications/stream`) for live notifications; web push via VAPID |
| CI/CD | GitHub Actions → ghcr.io Docker images → self-hosted VPS via Cloudflare Tunnel |

## Repo layout

```
apps/
  web/                       → Next.js — UI ONLY, calls API via typed client
  api/                       → NestJS — all business logic, DB, payments
    prisma/migrations/       → versioned SQL migrations
    scripts/                 → one-off ts scripts (overlap cleanup, etc.)
packages/
  types/                     → shared DTOs / API contracts (single source of truth)
  ui/                        → shared UI primitives (cn helper, dialog, buttons)
  config/                    → shared tsconfig, eslint, tailwind preset
docker-compose.yml           → postgres + redis + minio for local dev
```

`apps/web` is forbidden by ESLint from importing `@prisma/*`, `@nestjs/*`, or defining `MOCK_*` literals — all data flows through `@peerahat/types` and the typed `apiClient`.

## Local development

Prereqs: Node 20+, pnpm 9+, Docker (for postgres / redis / minio).

```bash
pnpm install
cp .env.example .env             # fill in Supabase creds + leave defaults

# Bring up Postgres + Redis + MinIO
docker compose up -d

# DB
pnpm --filter @peerahat/api prisma:generate
pnpm --filter @peerahat/api prisma:migrate
pnpm --filter @peerahat/api prisma:seed

# Run both apps
pnpm dev
# or individually
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:3001/api
```

See [`setup.md`](./setup.md) for test accounts, MinIO policy gotchas, and day-to-day commands.

### Useful commands

```bash
pnpm -r typecheck                         # whole workspace
pnpm --filter @peerahat/api test          # jest suite
pnpm --filter @peerahat/api resolve-overlaps --dry-run   # FR-TH-15 cleanup
```

### Configuration knobs

The defaults in `.env.example` are production-ready. Notable knobs:

- `BOOKING_DAY_START_HOUR` / `END_HOUR` (default `9` / `21`) — slot picker bounds. Mirrored on the web with `NEXT_PUBLIC_*`.
- `POSTPONE_TUTOR_CUT_SHORT_NOTICE` / `POSTPONE_PLATFORM_FEE_SHORT_NOTICE` (default `50` / `10`) — split percentages on short-notice student cancellations (FR-TH-11). Validated at module init — tutor + platform must sum to ≤ 100.
- `ZERCLE_SLIP_ENABLED=false` — skip ZercleSlip; slips land in the admin "รออนุมัติ" queue (FR-PM-01/02).
- `PLATFORM_COMMISSION_PCT=10` / `WITHHOLDING_TAX_PCT=3` — payout math (flat commission, Thai withholding tax). Validated at startup.
- `JOBS_ENABLED=false` — skip BullMQ registration (used by `openapi:export` or any run without Redis).
- `WEB_PUSH_VAPID_PUBLIC_KEY` / `WEB_PUSH_VAPID_PRIVATE_KEY` / `WEB_PUSH_SUBJECT` — web push delivery. Generate keys with `npx web-push generate-vapid-keys`. Omitting disables push silently without breaking subscribe endpoints.

## Implemented features (Phase 1)

### Booking lifecycle
- 30-min slot granularity throughout the booking flow (FR-TH-15)
- Booking durations 60 / 90 / 120 min; postpone proposals additionally allow 30 min
- Server-authoritative overlap guard via `BookingsService.assertNoOverlap` — half-open intervals, raw SQL with `+ interval N minutes` arithmetic, checks both student and tutor calendars at create / propose / confirm time
- `GET /tutors/:id/availability` + `GET /bookings/mine/busy` feed the picker's grey-out so blocked slots show before submit
- One-off cleanup script `scripts/resolve-existing-overlaps.ts` for any pre-FR-TH-15 conflicts

### Group bookings (FR-TH-18)
- Host student creates a group session and invites others; each invitee RSVPs independently
- Host pays the full group total (price × attendee count); invitees only confirm attendance, no payment
- Tutor approves the booking before the host pays
- Accepted invitees are included in the shared group chat thread
- `/bookings/group-pending` page shows the tutor's pending group approvals
- Admin-side: `/admin/bug-reports` triage queue shows group-related disputes

### Postpone-class negotiation (FR-TH-10..14)
- Either side opens a 2-hour negotiation chat thread from any paid, future booking
- BullMQ `postpone-timeout` queue fires at `chatExpiresAt`; resolver classifies outcome (`agreed` / `no_agreement` / `unresponsive` / `tutor_initiated_no_agreement`)
- `RefundPolicyService` centralises every split:
  - **Agreed** → no money moves; booking cloned to new slot, original marked `postponed`
  - **Student short-notice no-agreement** → 50 / 10 / 40 (env-driven)
  - **Tutor unresponsive** or **tutor-initiated declined** → 100 % student refund + `defectCount++`
- `RefundLedger` records every split; tutor `defectCount` deprioritises ranking (FR-TH-14)

### Tutor unavailability (FR-TH-16)
- Recurring weekly blocks (`TutorUnavailability` model: `weekday` + `startMinute` + `endMinute`)
- `expandWeeklyRules` helper expands rules into concrete intervals; reused by the busy endpoint and the overlap guard
- Editor on `/tutors/me/edit`: chip-style list with single-click delete + add form

### Schedule view
- `/bookings?view=schedule` renders a week grid — day rows × 30-min columns, sticky headers, today-row accent, pastel event cards
- Mobile collapses to a vertical day-grouped list; **รายการ (list)** is the default view
- Session type and invited students shown on booking rows (FR-BK-12)

### Real-time notifications (FR-CM-08)
- `NotificationsService.notify(...)` — single entry point with dedup (same `sourceType`+`sourceId` within 5 min) and per-type user overrides
- `Notification.category` (enum: `bookings` / `payments` / `chat` / `reports` / `reviews` / `account` / `system`) drives the accordion in `/account/notifications`
- Floating `NotificationBell` (bottom-right) + slide-up `NotificationPanel`; unread badge caps at "9+"
- `GET /notifications/stream` — SSE, auth via `?token=<supabase-jwt>`. `SseGateway` keeps an in-memory `Map<userId, Set<Response>>` with 30 s heartbeats; `notify()` fans rows out to every open tab
- **SSE → React Query cache invalidation**: backend mutations push `INVALIDATE:<queryKey>` events over SSE so the browser cache refreshes without polling
- **Web push (Phase 3)**: `web-push` + VAPID, service-worker handlers, permission prompt after 5 min activity (7-day snooze), `quietHours` (BKK-default tz). `/account/notifications` exposes master toggle, quiet-hours, devices list, and a **ส่งทดสอบ** button

> **Scaling note — SSE gateway is single-instance.** A notification on API container A won't reach a stream on container B. Swap `SseGateway` for a Redis pub/sub layer when going horizontal — same `emit`/`register` surface, `notify()` stays untouched.

### Bug reports (user → admin)
- Floating **รายงานปัญหา** launcher on every authenticated page; opens a modal with category select + free-text
- `/account/bugs` shows the submitter's own report history and status
- `/admin/bug-reports` triage queue: status filter, assign, resolve, mark duplicate
- `BugReport` model records `userId`, `category`, `description`, `status`, `adminNote`

### Account management
- **Universal profile edit** (`/profile`) — `displayName` + `avatarUrl` via `PATCH /users/me` + presigned-PUT avatar flow
- **Account deletion** (`/account/delete`, NFR-04) — 2-step confirm, PDPA-compliant anonymization: email → `deleted+<id>@peerahat.local`, `displayName` → "ผู้ใช้ที่ลบบัญชีแล้ว", avatar cleared, Supabase user deleted

### KYC improvements (FR-TH-02)
- Per-document **ดูตัวอย่าง** button on the upload step shows watermarked SVG samples
- Tutor intro-video gate removed — every applied tutor is searchable and bookable from day 1; KYC remains required only for verified badge

### TCAS Calculator (FR-TC-01..06)
- Full multi-system scoring: GPAX/TGAT/TPAT/A-Level/NetSat with per-round logic (`r1_portfolio`, `r2_quota_kku_netsat`, `r3_admission`, `r4_direct`)
- GPAX field accepts float (max 4.00) — FR-TC-03
- Canonical executable score algorithm spec in `ALGORITHM.md` + `score-algorithm.spec.ts`
- Admin TCAS AI bulk import via Gemini (`@google/genai`) at `/admin/tcas/import/criteria`

### Community (FR-CM-01..09)
- `/community` webboard — posts, replies, upvote, bookmark, report
- **V2 redesign** with mini-profile overlay on author click (FR-CM-09): banner + avatar seam, university/faculty display
- **Photo upload** on post composer: photos insert inline as signed S3 URLs
- `CommunityPost.authorBadge` (university badge) shown on every post card

### Chat (FR-TH-10..14, FR-TH-18)
- **V2 redesign**: desktop split-screen (thread list + chat room), mobile single-column with back navigation
- Inline booking proposal from chat thread
- `PostponePanel` for negotiation within a booking thread
- Chat bypass filter (FR-PM-08): server-side redact + `redacted: true` flag; client-side inline warning before send

### Other Phase 1 work shipped
- Real R2/S3 SDK in `StorageService` (NFR-03); falls back to `https://storage.local` stub in dev when `S3_*` env unset
- ZercleSlip verification wrapper (FR-PM-02) + EMVCo PromptPay payload generator
- Admin-confirmed payouts, 15th / 30th (FR-PM-06): `release-for-payout` daily cron; admin generates batch + uploads transfer proof
- Flat 10 % platform commission (FR-PM-04) + 3 % Thai withholding (FR-PM-07), both env-driven
- Google Calendar OAuth + Meet link generation per booking (FR-TH-17)
- Cron jobs: release-for-payout daily (FR-PM-05); KYC cold-archive hourly (NFR-03)
- PWA service worker, OAuth callback (Google), shadcn-style UI primitives
- Slip preview modal in `/admin/payments` (FR-PM-01)
- Landing page with subtle fade-up animations

## Testing

```bash
pnpm --filter @peerahat/api test
```

Test files under `apps/api/src/**/*.spec.ts`:

| File | Coverage |
|---|---|
| `refund-policy.service.spec.ts` | env validation + four refund cases + rounding |
| `bookings.service.spec.ts` | `intervalsOverlap` boundary semantics + `expandWeeklyRules` |
| `group-session.service.spec.ts` | group booking state machine + invitee RSVP paths |
| `score-algorithm.spec.ts` | TCAS canonical score + weight-sum invariant |
| `tcas.service.spec.ts` | program eligibility and round logic |
| `pricing.spec.ts` | commission + withholding tax + group-price calculations |
| `reports.service.spec.ts` + 4 others | report lifecycle, priority, rate-limit, resolution, admin |
| `zercle-slip.service.spec.ts` | slip validation contract + duplicate-dedupe |
| `google-oauth.service.spec.ts` + `google-calendar.service.spec.ts` | OAuth token flow + slot availability |
| `crypto.service.spec.ts` | symmetric encrypt/decrypt |
| `users.service.spec.ts` | PDPA anonymization on account deletion |
| `tcas-ai-parser.service.spec.ts` | Gemini parse output normalization |
| `target-resolver.service.spec.ts` | notification target resolution |

Workspace typecheck:

```bash
pnpm -r typecheck
```

## Deploy

Production runs on a **self-hosted VPS** at `peerahat.com`, fronted by **Cloudflare Tunnel** (no exposed ports). GitHub Actions builds `api` and `web` Docker images in parallel on every `main` push, publishes both `:latest` and `:<sha>` to **ghcr.io**, then deploys via `docker compose` on the VPS.

See [`docs/deploy.md`](./docs/deploy.md) for the full deployment guide.

## Out of scope (removed from the AI Studio prototype)

Gemini research-paper search, lesson knowledge graph, and AI Mentor / Persona configuration are intentionally not implemented.
