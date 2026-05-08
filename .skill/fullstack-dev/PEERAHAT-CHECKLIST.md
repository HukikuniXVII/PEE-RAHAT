# PEERAHAT Fullstack-Dev Skill Implementation Checklist

**Last Updated:** 2569-05-08  
**Status:** Planning Phase  
**Priority:** Critical for Phase 1 MVP  

---

## Overview

This checklist tracks the implementation of fullstack-dev skill patterns across PEERAHAT. 

- **Must-Have (Phase 1):** ✅ Blocking features, required before launch
- **Should-Have (Phase 1):** 🟡 Important for quality, but not blocking
- **Nice-to-Have (Phase 2+):** 📅 Deferred

---

## Section 1: Project Structure & Layering

**Status:** 🟡 Partial (NestJS modules exist, verify feature-first organization)

- [ ] **Feature-first directory audit**
  - Confirm each feature folder has: `.controller.ts`, `.service.ts`, `.repository.ts` (or similar)
  - Verify no cross-feature imports except through shared/common
  - Target: `apps/api/src/[feature]/*.ts` pattern
  - Files: Audit all feature folders in `apps/api/src/`
  - Priority: 🟡 Should-Have

- [ ] **Dependency injection review**
  - NestJS already uses DI via decorators (✅)
  - Verify Services only receive Repository/Service dependencies, not HTTP types
  - Files: All `.service.ts` files
  - Priority: 🟡 Should-Have

- [ ] **Remove controller business logic**
  - Controllers must be thin: parse request → validate → call service → format response
  - Audit all `.controller.ts` files
  - Move any business rules to service layer
  - Files: `apps/api/src/*/[feature].controller.ts`
  - Priority: ✅ Must-Have

- [ ] **Repository pattern consistency**
  - All DB queries isolated to repository layer
  - Services never call ORM directly
  - Create `apps/api/src/prisma/prisma.repository.ts` if needed
  - Files: `apps/api/src/*/[feature].repository.ts`
  - Priority: 🟡 Should-Have

---

## Section 2: Configuration & Environment

**Status:** 🔴 Incomplete (Need to verify)

- [ ] **Centralized config file**
  - Create `apps/api/src/config/config.ts` that loads ALL env vars
  - Must validate required vars **at startup** (fail fast)
  - Example: `const port = intEnv('PORT', 3000); if (!process.env.DATABASE_URL) throw new Error(...)`
  - Type-cast at this layer (string → number, boolean, etc.)
  - Files: `apps/api/src/config/`
  - Priority: ✅ Must-Have
  - Skill Reference: [Section 2](./SKILL.md#2-configuration--environment-critical)

- [ ] **Environment variables per environment**
  - Create `.env.development`, `.env.staging`, `.env.production`
  - Commit `.env.example` with dummy values, NOT .env files
  - Document each var in `.env.example`
  - Files: `.env.example`, apply to both `apps/api` and `apps/web`
  - Priority: ✅ Must-Have
  - Skill Reference: [references/environment-management.md](./references/environment-management.md)

- [ ] **Frontend API base URL**
  - Must be from `process.env.NEXT_PUBLIC_API_URL`, not hardcoded
  - Update `apps/web/lib/api-client.ts`
  - Files: `apps/web/lib/api-client.ts`, `apps/web/.env.example`
  - Priority: ✅ Must-Have

- [ ] **Secrets management**
  - Document which vars are secrets (JWT_SECRET, DATABASE_URL, etc.)
  - Use `.env.local` (per-developer) for secrets in dev
  - Plan for Doppler or AWS Secrets Manager in production
  - Files: Documentation in `.env.example`
  - Priority: 🟡 Should-Have

- [ ] **Validate configuration at app startup**
  - Test: `npm run dev:api` should fail fast if required env var is missing
  - Example: Missing DATABASE_URL → error before server starts
  - Files: `apps/api/src/main.ts`
  - Priority: ✅ Must-Have

---

## Section 3: Error Handling & Resilience

**Status:** 🔴 Missing (Critical!)

- [ ] **Define typed error hierarchy**
  - Create `apps/api/src/common/errors/app.error.ts`
  - Base: `AppError` with `code`, `statusCode`, `message`
  - Subclasses: 
    - `NotFoundError` (404)
    - `ValidationError` (422) with field errors
    - `UnauthorizedError` (401)
    - `ForbiddenError` (403)
    - `ConflictError` (409)
    - Add more as needed
  - Files: `apps/api/src/common/errors/`
  - Priority: ✅ Must-Have
  - Skill Reference: [Section 3](./SKILL.md#3-error-handling--resilience-high)

- [ ] **Global error handler middleware**
  - Create `apps/api/src/common/middleware/error-handler.middleware.ts`
  - Catches all errors, maps AppError to JSON response
  - Non-operational errors → log + generic 500
  - Never expose stack traces to client
  - Files: `apps/api/src/common/`
  - Priority: ✅ Must-Have

- [ ] **Request ID propagation**
  - Add `request-id` middleware before error handler
  - Each request gets unique ID (UUID)
  - ID attached to logs and error responses
  - Files: `apps/api/src/common/middleware/request-id.middleware.ts`
  - Priority: 🟡 Should-Have

- [ ] **Update all existing error throws**
  - Audit codebase: grep for `throw new Error`, `throw`, `res.status(500)`
  - Replace with typed errors
  - Files: All `*.service.ts`, `*.controller.ts`
  - Priority: ✅ Must-Have

- [ ] **Test error responses**
  - Verify malformed request → 422 with field errors
  - Verify missing resource → 404 with consistent format
  - Verify unauthorized → 401 with message
  - Files: Test suite
  - Priority: 🟡 Should-Have

---

## Section 4: Database Access Patterns

**Status:** 🟡 Partial (Prisma in place, verify patterns)

- [ ] **Review migrations for reversibility**
  - Prisma migrations are reversible by default ✅
  - Old migrations must not have `CREATE TABLE IF NOT EXISTS` (not reversible)
  - Document migration rationale in commit messages
  - Files: `apps/api/prisma/migrations/`
  - Priority: 🟡 Should-Have

- [ ] **Prevent N+1 queries**
  - Audit all `findMany` and `findFirst: include/select` usage
  - Example: Orders with items = `include: { items: true }`
  - No loops doing DB queries
  - Files: All `*.repository.ts` or `*.service.ts` with DB calls
  - Priority: 🟡 Should-Have

- [ ] **Transactions for multi-step writes**
  - Payment + order creation = `db.$transaction(async (tx) => { ... })`
  - Payout processing = transactional
  - Files: `apps/api/src/payments/`, `apps/api/src/admin/`
  - Priority: 🟡 Should-Have

- [ ] **Connection pooling configured**
  - Verify `DATABASE_URL` includes pool size
  - Example: `postgresql://user:pass@host/db?schema=public&poolSize=10`
  - Files: `.env.example`
  - Priority: 🟡 Should-Have

- [ ] **Seed data for local development**
  - Create `apps/api/prisma/seed.ts` with sample tutors, students, etc.
  - Run: `npx prisma db seed`
  - Helps onboard new developers
  - Enables faster local testing
  - Files: `apps/api/prisma/seed.ts`
  - Priority: 🟡 Should-Have

---

## Section 5: API Client Patterns

**Status:** 🟡 Partial (fetch wrapper exists, verify)

- [ ] **Type-safe fetch wrapper**
  - Review `apps/web/lib/api-client.ts`
  - Ensure: generic `<T>` for response types
  - Ensure: error throwing with status code
  - Ensure: Bearer token auto-attached
  - Files: `apps/web/lib/api-client.ts`
  - Priority: ✅ Must-Have
  - Skill Reference: [Section 5 Option A](./SKILL.md#option-a-typed-fetch-wrapper-simple-no-dependencies)

- [ ] **Define API response types**
  - Standard wrapper: `{ data: T, error?: ErrorResponse }` or just `T` with error throw
  - Document in shared types
  - Files: `packages/types/src/api.ts`
  - Priority: 🟡 Should-Have

- [ ] **Error mapping to user messages**
  - Frontend catches ApiError, maps to user-friendly message
  - Example: 422 + validation errors → show per-field errors
  - Example: 401 → show "Please log in"
  - Files: `apps/web/lib/error-handler.ts` (create if missing)
  - Priority: ✅ Must-Have
  - Skill Reference: [Section 12](./SKILL.md#12-cross-boundary-error-handling-medium)

- [ ] **Structured type definitions**
  - All API request/response types in `packages/types/`
  - Never duplicate types between frontend + backend
  - Use import from `@peerahat/types`
  - Files: `packages/types/src/*.ts`
  - Priority: ✅ Must-Have (CLAUDE.md guideline)

- [ ] **React Query setup (optional for Phase 1)**
  - If API calls grow in complexity, migrate to React Query
  - Otherwise, typed fetch wrapper is sufficient
  - Files: `apps/web/` (optional)
  - Priority: 📅 Phase 2+

---

## Section 6: Authentication & Middleware

**Status:** 🟡 Partial (Supabase JWT exists, verify middleware order)

- [ ] **Middleware execution order**
  - Verify: RequestID → Logging → CORS → RateLimit → BodyParse → Auth → Validation → Handler → ErrorHandler
  - Update NestJS middleware order in `app.module.ts`
  - Files: `apps/api/src/app.module.ts`
  - Priority: 🟡 Should-Have
  - Skill Reference: [Section 6 Middleware Order](./SKILL.md#standard-middleware-order)

- [ ] **JWT token strategy**
  - Access token: Short expiry (15 min)
  - Refresh token: Longer expiry (7 days), stored in database/cache
  - Verify: `supabase-jwt.strategy.ts` follows pattern
  - Files: `apps/api/src/auth/supabase-jwt.strategy.ts`
  - Priority: ✅ Must-Have

- [ ] **Token refresh endpoint**
  - Endpoint: POST `/api/auth/refresh`
  - Accepts refresh token (from cookie or body)
  - Returns new access token
  - Updates refresh token if rotating
  - Files: `apps/api/src/auth/auth.controller.ts`
  - Priority: ✅ Must-Have

- [ ] **Frontend token refresh on 401**
  - API client: on 401, call refresh endpoint, retry original request
  - Transparent to components
  - Files: `apps/web/lib/api-client.ts`
  - Priority: ✅ Must-Have

- [ ] **Current user decorator**
  - `@CurrentUser()` extracts user from JWT
  - Available in controller parameters
  - Verify: `current-user.decorator.ts` is correctly implemented
  - Files: `apps/api/src/auth/current-user.decorator.ts`
  - Priority: ✅ Must-Have

- [ ] **RBAC (Role-Based Access Control)**
  - Create `@Authorize('admin', 'tutor')` middleware
  - Check user.roles against required roles
  - Return 403 Forbidden if unauthorized
  - Files: `apps/api/src/auth/authorize.decorator.ts` (create if missing)
  - Priority: 🟡 Should-Have

- [ ] **Auth flow documentation**
  - Document login, token refresh, logout in code
  - Link to [references/auth-flow.md](./references/auth-flow.md) in comments
  - Files: `apps/api/src/auth/`, `apps/web/lib/`
  - Priority: 🟡 Should-Have

---

## Section 7: Logging & Observability

**Status:** 🔴 Missing (Critical for compliance)

- [ ] **Structured JSON logging setup**
  - Install logger: Winston, Pino, or bunyan
  - Recommendation: **Pino** (fast, Node.js optimized)
  - Create `apps/api/src/common/logger.ts`
  - Files: `apps/api/src/common/`
  - Priority: ✅ Must-Have (PDPA/Computer Crime Act compliance!)
  - Skill Reference: [Section 7](./SKILL.md#7-logging--observability-medium-high)

- [ ] **Request ID in every log**
  - Middleware injects request ID
  - Logger includes it in all outputs
  - Enables request tracing
  - Files: `apps/api/src/common/middleware/request-id.middleware.ts`
  - Priority: ✅ Must-Have (Compliance!)

- [ ] **Replace all console.log**
  - Grep: `console.log`, `console.error`, `console.warn`
  - Replace with `logger.info()`, `logger.error()`, `logger.warn()`
  - Keep console.log only for debugging (and only in dev)
  - Files: All `*.service.ts`, `*.controller.ts`, background jobs
  - Priority: ✅ Must-Have

- [ ] **Log sensitive operations**
  - Every login attempt → log with IP, timestamp, success/failure
  - KYC submission → log what was uploaded, by whom, when
  - Payment processing → amount, payer, payee, status
  - Order state changes → before/after, who changed it
  - Files: Relevant services
  - Priority: ✅ Must-Have (Computer Crime Act §8 requires IP + timestamp logs)

- [ ] **Never log secrets**
  - No passwords, JWTs, API keys, credit cards
  - Mask PII if logging (first name, ID prefix only)
  - Add log sanitizer middleware if needed
  - Files: All `*.service.ts`
  - Priority: ✅ Must-Have

- [ ] **Log levels configured**
  - Development: DEBUG (see everything)
  - Production: INFO (normal + errors, no debug noise)
  - Emergency: ERROR (critical issues only, on-call alert)
  - Files: Config (Section 2 related)
  - Priority: 🟡 Should-Have

---

## Section 8: Background Jobs & Async

**Status:** 📅 Phase 2 (Payout batching deferred)

- [ ] **Payout job idempotency**
  - Payout scheduled 2x monthly (FR-PM-06)
  - Job must be idempotent: same job running twice = same result
  - Check: Payout status == 'completed' → skip
  - Files: `apps/api/src/admin/payout.service.ts` (create Phase 2)
  - Priority: 📅 Phase 2

- [ ] **Job scheduling framework**
  - Consider: node-cron, Bull + Redis, or AWS EventBridge
  - Phase 1: Node-cron for simple scheduling
  - Phase 2: Upgrade to Bull for retries + queue management
  - Files: `apps/api/src/admin/`
  - Priority: 📅 Phase 2

---

## Section 9: Caching Patterns

**Status:** 📅 Phase 2 (Deferred for MVP)

- [ ] **Cache-aside for reads**
  - Example: User profiles, tutor listings
  - Always set TTL (never cache without expiry)
  - Invalidate on write
  - Files: `apps/api/src/*/[feature].service.ts`
  - Priority: 📅 Phase 2+

---

## Section 10: File Upload Patterns

**Status:** 🟡 In-scope Phase 1 (KYC images, sheets)

- [ ] **KYC file upload**
  - KYC images: ID, selfie, transcript (~2-5 MB each)
  - Decision: Presigned URL to S3/R2 ✅ (recommended)
  - Backend: GET `/api/kyc/presign` → returns S3 signed URL
  - Frontend: Direct upload to S3, then notify backend
  - Files: `apps/api/src/kyc/`, create `apps/web/components/kyc-upload.tsx`
  - Priority: ✅ Must-Have
  - Skill Reference: [Section 10 Option A](./SKILL.md#option-a-presigned-url-recommended-for-large-files)

- [ ] **Sheet PDF upload**
  - Sheets: ~5-50 MB PDFs
  - Decision: Presigned URL to S3/R2
  - Same pattern as KYC
  - Files: `apps/api/src/sheets/`
  - Priority: ✅ Must-Have

- [ ] **Payment slip image upload**
  - Slip: ~1-3 MB image
  - Decision: Multipart form (small, simple) or presigned URL
  - After upload: Send to SlipOK API for verification (FR-PM-01)
  - Files: `apps/api/src/payments/`
  - Priority: ✅ Must-Have

- [ ] **Configure S3/Cloudflare R2**
  - Bucket 1: `peerahat-kyc` (private, audit-logged access)
  - Bucket 2: `peerahat-sheets` (private, audit-logged)
  - Bucket 3: `peerahat-slips-temp` (private, auto-delete after 7 days)
  - Files: Infrastructure config, `.env.example`
  - Priority: ✅ Must-Have

- [ ] **Signed URL generation endpoint**
  - Endpoint: POST `/api/uploads/presign`
  - Query: `?filename=...&type=image/jpeg&maxSize=5242880`
  - Returns: `{ uploadUrl, fileKey, expiresIn }`
  - Files: `apps/api/src/common/storage.service.ts` (exists!)
  - Priority: ✅ Must-Have

---

## Section 11: Real-Time Patterns

**Status:** 🟡 Phase 1 (Chat via polling or SSE)

- [ ] **Chat real-time decision**
  - Option: Polling every 3-5 seconds (simple, Phase 1)
  - Option: SSE for one-way server → client notifications
  - Option: WebSocket for bidirectional (Phase 2)
  - Decision: **Start with polling** in Phase 1 (FR-TH-05)
  - Files: `apps/api/src/chat/`, `apps/web/components/chat.tsx`
  - Priority: ✅ Must-Have for Phase 1
  - Skill Reference: [Section 11 Option C](./SKILL.md#option-c-polling-simplest-no-infrastructure)

- [ ] **Chat message endpoints**
  - POST `/api/chats/{chatId}/messages` — send message
  - GET `/api/chats/{chatId}/messages?since=timestamp` — fetch new messages (polling)
  - Files: `apps/api/src/chat/chat.controller.ts`
  - Priority: ✅ Must-Have

- [ ] **Chat message ordering**
  - Timestamps: ISO 8601, UTC
  - Sort by createdAt ASC
  - Files: `apps/api/src/chat/chat.service.ts`
  - Priority: ✅ Must-Have

---

## Section 12: Cross-Boundary Error Handling

**Status:** 🟡 Partial (verify frontend error mapping)

- [ ] **API error response format**
  - Type: `{ title: string, status: number, detail: string, request_id: string }`
  - Example: `{ title: "VALIDATION_ERROR", status: 422, detail: "...", request_id: "req_123" }`
  - Files: Backend error handler (Section 3)
  - Priority: ✅ Must-Have

- [ ] **Frontend error handler**
  - Create `apps/web/lib/error-handler.ts`
  - Maps API error code → user-facing message (Thai text!)
  - 401 → "กรุณาเข้าสู่ระบบ"
  - 422 → field-level errors
  - Files: `apps/web/lib/`
  - Priority: ✅ Must-Have

- [ ] **Show validation errors next to form inputs**
  - On 422, backend returns `errors: [{ field: 'email', message: '...' }]`
  - Frontend maps to form state, renders near input
  - Files: Form components in `apps/web/components/`
  - Priority: 🟡 Should-Have

- [ ] **Auto-retry logic**
  - Retry 5xx errors (max 3 times with exponential backoff)
  - Never retry 4xx errors
  - Files: `apps/web/lib/api-client.ts`
  - Priority: 🟡 Should-Have

---

## Section 13: Production Hardening

**Status:** 🔴 Incomplete

- [ ] **Health check endpoints**
  - GET `/health` — liveness check (just return 200)
  - GET `/ready` — readiness check (test DB, cache, external services)
  - Files: Create `apps/api/src/common/health/`
  - Priority: ✅ Must-Have
  - Skill Reference: [Section 13](./SKILL.md#13-production-hardening-medium)

- [ ] **Graceful shutdown**
  - On SIGTERM: Stop accepting connections, finish in-flight requests, close DB
  - Files: `apps/api/src/main.ts`
  - Priority: ✅ Must-Have

- [ ] **CORS hardening**
  - Explicit origins: `CORS_ORIGINS=https://peerahat.com,https://app.peerahat.com`
  - Never `*` in production
  - Files: Config (Section 2)
  - Priority: ✅ Must-Have

- [ ] **Security headers**
  - Install `@nestjs/helmet` or helmet.js equivalent
  - Enables: Content-Security-Policy, X-Frame-Options, etc.
  - Files: `apps/api/src/app.module.ts`
  - Priority: 🟡 Should-Have

- [ ] **Rate limiting**
  - Public endpoints (login, signup, payment slip upload): 10 req/min per IP
  - Install: `@nestjs/throttler` or express-rate-limit
  - Files: `apps/api/src/app.module.ts`
  - Priority: 🟡 Should-Have

- [ ] **Input validation on ALL endpoints**
  - Use Zod or Pydantic for schema validation
  - Validate at controller boundary, before passing to service
  - Files: All `*.controller.ts`
  - Priority: ✅ Must-Have

- [ ] **HTTPS enforced**
  - Test: `curl -k https://api.peerahat.com/health` succeeds
  - Dev: Self-signed cert OK
  - Prod: Real SSL certificate
  - Files: Infrastructure/deployment config
  - Priority: ✅ Must-Have

- [ ] **Secrets rotation plan**
  - JWT signing key rotated annually (minimum)
  - Database password rotated on team changes
  - S3/R2 credentials rotated quarterly
  - Files: Documentation
  - Priority: 🟡 Should-Have

---

## Summary by Phase

### Phase 1 MVP (✅ Must-Have Before Launch)

1. **Section 1 (Structure):** Verify feature-first, no controller biz logic
2. **Section 2 (Config):** Centralized, env vars, fail-fast startup
3. **Section 3 (Errors):** Typed errors, global handler, request ID
4. **Section 5 (API Client):** Type-safe fetch, error mapping
5. **Section 6 (Auth):** JWT refresh, middleware order, decorators
6. **Section 7 (Logging):** Structured logs, request ID, security logs (PDPA!)
7. **Section 10 (Uploads):** Presigned URLs for KYC, sheets, slips
8. **Section 12 (Error Handling):** User-facing error messages (Thai)
9. **Section 13 (Hardening):** /health, /ready, graceful shutdown, CORS, security headers

### Phase 1 MVP (🟡 Should-Have for Quality)

- Section 4: N+1 prevention, transactions
- Section 6: RBAC authorization
- Section 7: Log levels configured
- Section 13: Rate limiting, HTTPS

### Phase 2+ (📅 Deferred)

- Section 8: Background jobs (payout batching)
- Section 9: Caching (user profiles, tutor listings)
- Section 11: WebSocket real-time chat
- Section 5: React Query (if complexity grows)

---

## Tracking Progress

> Use this section to update status as you go.

| Section | Topic | Status | Owner | ETA | Notes |
|---------|-------|--------|-------|-----|-------|
| 1 | Structure | 🟡 In Review | @dev | 2569-05-15 | Audit feature folders |
| 2 | Config | 🔴 Todo | @dev | 2569-05-20 | Create centralized config |
| 3 | Errors | 🔴 Todo | @dev | 2569-05-22 | Define error hierarchy |
| 4 | Database | 🟡 In Review | @dev | 2569-05-25 | Check migrations, N+1 |
| 5 | API Client | 🟡 In Review | @dev | 2569-05-27 | Type safety check |
| 6 | Auth | 🟡 In Review | @dev | 2569-05-28 | Middleware order |
| 7 | Logging | 🔴 Todo | @dev | 2569-05-30 | Integrate structured logger |
| 10 | Uploads | 🔴 Todo | @dev | 2569-06-01 | Presigned URL endpoints |
| 11 | Real-Time |🔴 Todo | @dev | 2569-06-03 | Chat polling endpoints |
| 12 | Error Handling | 🟡 In Review | @dev | 2569-06-05 | Frontend error mapping |
| 13 | Hardening | 🔴 Todo | @dev | 2569-06-10 | /health, graceful shutdown |

---

## Commit Message Template

When implementing skill patterns, reference the relevant section:

```
[FR-*] Implement <feature>: Section <N> pattern

- Description of change
- References Fullstack-Dev Skill Section <N>: <pattern name>
- Why: <one sentence explaining benefit>

Link: .skill/fullstack-dev/SKILL.md#<section>
```

**Example:**

```
[FR-TH-02] Setup structured JSON logging: Section 7

- Integrated Pino logger
- Added request ID middleware
- Replaced all console.log with logger calls
- References Fullstack-Dev Skill Section 7: Logging & Observability
- Why: PDPA + Computer Crime Act compliance requires audit logs

Link: .skill/fullstack-dev/SKILL.md#7-logging--observability-medium-high
```

---

## Questions & Clarifications

**Q: I'm stuck on [Section X]. Where do I start?**  
A: Read the main SKILL.md section, then the corresponding reference guide if available.

**Q: Do I have to implement ALL of Section 3 NOW?**  
A: ✅ Yes, Sections 1-3, 6-7, 13 are blocking Phase 1. Others can be phased.

**Q: Can I skip Section 8 (Background Jobs)?**  
A: Yes. Phase 1 has manual payout processing. Implement Section 8 in Phase 2.

**Q: What if I find an error in the skill document?**  
A: Reference the original: https://github.com/MiniMax-AI/skills/tree/main/skills/fullstack-dev

---

**End of Implementation Checklist**

Start with Section 1, 2, 3, then work in priority order. Reference `PEERAHAT-INTEGRATION.md` for context.

