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
| Storage | S3-compatible (Cloudflare R2 or AWS S3) for KYC + sheets |
| Cache / Queues | Redis + BullMQ |
| Payments | Manual PromptPay + SlipOK (Phase 1) → Opn Payments (Phase 2) |

## Repo layout

```
apps/
  web/    → Next.js — UI ONLY, calls API via typed client
  api/    → NestJS — all business logic, DB, payments
packages/
  types/  → shared DTOs / API contracts (single source of truth)
  ui/     → shared UI primitives (cn helper, future shadcn components)
  config/ → shared tsconfig, eslint, tailwind preset
```

`apps/web` is forbidden by ESLint from importing `@prisma/*`, `@nestjs/*`, or defining `MOCK_*` literals — all data flows through `@peerahat/types` and the typed `apiClient`.

## Local development

Prereqs: Node 20+, pnpm 9+, PostgreSQL 15+, Redis 7+.

```bash
pnpm install
cp .env.example .env             # fill in Supabase + DB creds

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

## What's implemented (Phase 1 scaffold)

- ✅ Monorepo (pnpm + Turborepo)
- ✅ Shared DTOs in `@peerahat/types` covering all Phase 1 endpoints
- ✅ All AI Studio screens migrated to App Router routes — **no mock data**
- ✅ NestJS modules for tutors, bookings, sheets, TCAS, quiz, community, chat, payments, KYC, admin
- ✅ Prisma schema with all Phase 1 entities + audit log (NFR-05)
- ✅ Server-side bypass filter (FR-PM-08) wired into `chat/send`
- ✅ Supabase JWT auth guard
- ✅ PWA manifest (NFR-10)

## TODO before Phase 1 ship

- [x] Real R2/S3 SDK in `StorageService` (NFR-03)
- [x] Real SlipOK call in `SlipOkClient` (FR-PM-01)
- [x] EMVCo PromptPay payload generator (FR-PM-01)
- [x] BullMQ payout batch job (15th/30th, FR-PM-06) with 3% withholding (FR-PM-07)
- [ ] Cron job to archive verified KYC files to cold storage within 24h (NFR-03)
- [x] Cron job to release escrow once 24h report window expires (FR-PM-05)
- [x] Tutor profile detail page (`/tutors/[id]`)
- [x] Booking flow page (`/tutors/[id]/book`)
- [x] Chat page (`/chat/[threadId]`)
- [x] Sheet upload page (`/sheets/upload`)
- [ ] OAuth callback route (`/login` email+password is done; Supabase OAuth flow still pending)
- [x] Service worker for offline PWA (NFR-10)
- [ ] Real shadcn/ui Button/Card/Dialog primitives in `@peerahat/ui`

Out-of-scope items removed from the AI Studio prototype: Gemini research-paper search, lesson knowledge graph, and AI Mentor / Persona configuration.
