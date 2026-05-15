# Pee Rahat

Verified EdTech marketplace connecting Thai high-school students preparing for **TCAS** with university-student tutors. Four pillars — Tutor Hub, Sheet Marketplace, TCAS Calculator, Community — unified by escrow-based payments.

See [`requirements.md`](./requirements.md) for the full product spec.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL via Prisma |
| Auth | Supabase Auth (JWT validated by NestJS) |
| Storage | S3-compatible (AWS S3 in prod, MinIO in dev) for KYC + sheets |
| Cache / Queues | Redis + BullMQ |
| Payments | Manual PromptPay + ZercleSlip verification API; admin-confirmed payouts (auto-gateway integration is off the roadmap — see requirements.md §4.5) |

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

### Useful commands

```bash
pnpm -r typecheck                         # whole workspace
pnpm --filter @peerahat/api test          # jest (23 unit tests today)
pnpm --filter @peerahat/api resolve-overlaps --dry-run   # FR-TH-15 cleanup
```

### Configuration knobs

The defaults in `.env.example` are production-ready. Notable knobs:

- `BOOKING_DAY_START_HOUR` / `END_HOUR` (default `9` / `21`) — slot picker bounds. Mirrored on the web with `NEXT_PUBLIC_*` so the picker stays in sync without a build flag.
- `POSTPONE_TUTOR_CUT_SHORT_NOTICE` / `POSTPONE_PLATFORM_FEE_SHORT_NOTICE` (default `50` / `10`) — split percentages applied when a student-initiated postpone is rejected inside the 12 h short-notice window (FR-TH-11). Validated at module init — tutor + platform must sum to ≤ 100.
- `ZERCLE_SLIP_ENABLED=false` — skip the ZercleSlip API call entirely; slips land in the admin "รออนุมัติ" queue for human approval (FR-PM-01/FR-PM-02).
- `PLATFORM_COMMISSION_PCT=10` / `WITHHOLDING_TAX_PCT=3` — payout math knobs (flat commission, Thai withholding tax). Validated at startup.
- `JOBS_ENABLED=false` — skip BullMQ registration (used by `openapi:export` or any run without Redis).

## Implemented features (Phase 1)

### Booking lifecycle
- 30-min slot granularity throughout the booking flow (FR-TH-15)
- Booking durations 60 / 90 / 120 min; postpone proposals additionally allow 30 min
- Server-authoritative overlap guard via `BookingsService.assertNoOverlap` — half-open intervals, raw SQL with `+ interval N minutes` arithmetic, checks both student and tutor calendars at create / propose / confirm time
- `GET /tutors/:id/availability` + `GET /bookings/mine/busy` feed the picker's grey-out so blocked slots show before submit
- One-off cleanup script `scripts/resolve-existing-overlaps.ts` for any pre-FR-TH-15 conflicts (refunds the later booking 100 % via `RefundReason='admin_manual'`)

### Postpone-class negotiation (FR-TH-10..14)
- Either side opens a 2-hour negotiation chat thread from any paid, future booking
- BullMQ `postpone-timeout` queue fires at `chatExpiresAt`; resolver classifies outcome (`agreed` / `no_agreement` / `unresponsive` / `tutor_initiated_no_agreement`) by inspecting counterparty messages
- `RefundPolicyService` centralises every split:
  - **Agreed** → no money moves; booking cloned to new slot, original marked `postponed`
  - **Student short-notice no-agreement** → 50 / 10 / 40 (env-driven)
  - **Tutor unresponsive** or **tutor-initiated declined** → 100 % student refund + `defectCount++`
- `RefundLedger` records every split; `PaymentIntent.amountThb` reduced in place so the existing payout batch picks up the tutor's portion unchanged
- Tutor `defectCount` deprioritises ranking — final `orderBy: { defectCount: 'asc' }` tiebreaker in `TutorsService.search` (FR-TH-14)
- 12 unit tests cover all four refund cases + env validation + boundary rounding

### Tutor unavailability (FR-TH-16)
- Recurring weekly blocks (`TutorUnavailability` model: `weekday` + `startMinute` + `endMinute` + optional `reason`)
- `expandWeeklyRules` helper expands rules into concrete intervals; reused by the busy endpoint and the overlap guard
- Editor on `/tutors/me/edit`: chip-style list with single-click delete + add form (`ทุกวัน` option splats into 7 rules)

### Schedule view
- `/bookings?view=schedule` (default) renders a modern airy week grid — day rows × 30-min columns with sticky headers, today-row indigo accent, pastel event cards with colored left-accent stripes
- Mobile (<md) collapses to a vertical day-grouped list
- Toggle to the original list view (`?view=list`)
- Span resolution is exact: 30 min = 1 cell, 60 = 2, 90 = 3, 120 = 4

### Other Phase 1 work shipped
- Tutor intro video supports YouTube / Vimeo / direct file URLs (auto-rewrite to embed where needed)
- Real R2/S3 SDK in `StorageService` (NFR-03)
- ZercleSlip verification wrapper (FR-PM-02) + EMVCo PromptPay payload generator
- Admin-confirmed payouts, 15th / 30th (FR-PM-06): `release-for-payout` daily cron flips eligible intents into the queue; admin generates the batch and uploads transfer proof per tutor
- Flat 10 % platform commission (FR-PM-04) + 3 % Thai withholding (FR-PM-07), both env-driven
- Cron jobs: release-for-payout daily after 24 h report window (FR-PM-05); KYC cold-archive within 24 h (NFR-03)
- Tutor profile detail, booking stepper, chat, sheet upload, OAuth callback (Google), PWA service worker, shadcn-style UI primitives

## Testing

`pnpm --filter @peerahat/api test` runs the Jest suite — **23 tests** across two files:

- `refund-policy.service.spec.ts` (12) — env validation + all four refund cases + rounding edge cases
- `bookings.service.spec.ts` (11) — `intervalsOverlap` boundary semantics (touching edges, 1-min overlap, 30-min slot adjacency) + `expandWeeklyRules` (multi-day expansion, window boundaries, multi-weekday)

Workspace typecheck:

```bash
pnpm -r typecheck
```

## Out of scope (removed from the AI Studio prototype)

Gemini research-paper search, lesson knowledge graph, and AI Mentor / Persona configuration are intentionally not implemented.
