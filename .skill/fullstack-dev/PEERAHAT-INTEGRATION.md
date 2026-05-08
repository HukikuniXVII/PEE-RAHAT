# Fullstack-Dev Skill — PEERAHAT Integration Guide

**Installation Date:** 2569-05-08  
**Skill Version:** 1.0.0 (MiniMax-AI)  
**Project:** Pee Rahat (Thai EdTech Marketplace)  
**Status:** ✅ Installed & Ready  

---

## Quick Summary

The **fullstack-dev skill** is a comprehensive architecture, testing, and production-hardening guide. It provides:

- **Project structure patterns** (feature-first organization)
- **7 Core Principles** for clean full-stack architecture
- **13 Detailed Sections** on config, errors, database, auth, logging, real-time, etc.
- **8 Reference Guides** for specialized topics (API design, auth flow, DB schema, etc.)

This document explains how to apply the skill to **PEERAHAT**.

---

## Core Principles for PEERAHAT

```
✅ 1. Organize by FEATURE, not by technical layer
✅ 2. Controllers never contain business logic
✅ 3. Services never import HTTP request/response types
✅ 4. All config from env vars, validated at startup, fail fast
✅ 5. Every error is typed, logged, and returns consistent format
✅ 6. All input validated at the boundary — trust nothing from client
✅ 7. Structured JSON logging with request ID — not console.log
```

---

## PEERAHAT Stack Alignment

| Layer | Technology | Skill Reference |
|-------|-----------|-----------------|
| **Backend** | NestJS (Node.js) | Section 1, 3, 6, 7, 8, 13 |
| **Frontend** | Next.js (TypeScript + React) | Section 5, 6, 12 |
| **Database** | PostgreSQL (Prisma ORM) | Section 4 |
| **Auth** | Supabase JWT (custom) | Section 6 + [auth-flow.md](./references/auth-flow.md) |
| **Shared Types** | /packages/types | Section 5, 12 |
| **Real-time** | (Phase 2) | Section 11 |
| **File Storage** | (Not yet decided) | Section 10 |

---

## Implementation Status Checklist

> For each feature of PEERAHAT, verify it follows the skill's guidelines.

### ✅ Already Implemented (Verify)

- [ ] **Monorepo structure** (pnpm workspaces) — feature-first candidate
- [ ] **Shared types** (/packages/types) — excellent foundation
- [ ] **NestJS modules** (one per feature) — aligns with feature-first
- [ ] **Prisma ORM** — migrations setup ✓
- [ ] **Authentication** (Supabase JWT) — verify middleware order per Section 6

### 🔄 In Progress (Audit & Refactor)

- [ ] **Error handling** — Verify TypeScript error hierarchy (Section 3)
- [ ] **Configuration** — Review env vars, fail-fast startup (Section 2)
- [ ] **Input validation** — Check all endpoints (Section 1, controller rule)
- [ ] **Logging** — Verify structured JSON logs + request IDs (Section 7)
- [ ] **API client** — Check frontend fetch patterns (Section 5)

### ⏳ Phase 1 Scope (Implement)

- [ ] **Real-time chat** — Use Section 11 (SSE vs WebSocket decision)
- [ ] **File uploads** (KYC images, sheets) — Section 10 patterns
- [ ] **Health checks** — /health, /ready endpoints (Section 13)
- [ ] **Graceful shutdown** — SIGTERM handling (Section 13)
- [ ] **CORS hardening** — Explicit origins, no `*` (Section 6, 13)
- [ ] **Rate limiting** — Public endpoints (Section 13)

### 📋 Phase 2+ (Deferred)

- [ ] **Video classroom** — LiveKit/Daily.co integration
- [ ] **Watermarking** — PDF watermarking service (Section 10)
- [ ] **Background jobs** — Payout batches, watermark generation (Section 8)
- [ ] **Caching** — Redis for performance (Section 9)

---

## Immediate Next Steps

### 1. Read the Core Sections (This Week)

Priority order for PEERAHAT context:

1. **Section 1:** Project Structure — confirm feature-first layout
2. **Section 3:** Error Handling — design your error hierarchy (AppError, NotFoundError, ValidationError, etc.)
3. **Section 6:** Auth & Middleware — middleware order, JWT refresh flow
4. **Section 7:** Logging — integrate structured logger (pino, winston, bunyan)
5. **Section 13:** Production Hardening — /health, /ready checks, graceful shutdown

### 2. Create Error Hierarchy (Backend)

Create `apps/api/src/common/errors/`:
- `app.error.ts` — base AppError class
- `app.errors.ts` — all typed errors (NotFoundError, ValidationError, UnauthorizedError, etc.)
- `global.error-handler.ts` — middleware to catch & format errors

**Reference:** [Section 3](./SKILL.md#3-error-handling--resilience-high)

### 3. Review & Harden Config

Update `apps/api/src/config/` to follow Section 2 pattern:
- Load all env vars in one place
- Validate required vars **at startup** (fail fast)
- Type-cast at config layer
- Commit `.env.example` with dummy values

**Reference:** [Section 2](./SKILL.md#2-configuration--environment-critical)

### 4. Add Health Checks

Add `/health` (liveness) and `/ready` (readiness) endpoints to `apps/api/src/common/health/`.

**Reference:** [Section 13](./SKILL.md#13-production-hardening-medium)

### 5. Frontend API Client

Review `apps/web/lib/api-client.ts` against Section 5 patterns.  
Ensure:
- [ ] Typed wrapper
- [ ] Error mapping to user messages
- [ ] Auto-attach auth token
- [ ] Transparent token refresh on 401

**Reference:** [Section 5](./SKILL.md#5-api-client-patterns-medium) + [Section 12](./SKILL.md#12-cross-boundary-error-handling-medium)

---

## Key Decision Points for PEERAHAT

### 1. API Client Pattern (Frontend)

**Skill Section:** [Section 5](./SKILL.md#5-api-client-patterns-medium)

Current: Likely a simple fetch wrapper in `apps/web/lib/api-client.ts`

**Decision:**
- ✅ **Typed fetch wrapper** (what you have) — lean, no dependencies
- 🔄 Migrate to React Query if complexity grows (Phase 2+)
- ❌ tRPC — overkill for PEERAHAT's REST backend

### 2. Real-Time Chat

**Skill Section:** [Section 11](./SKILL.md#11-real-time-patterns-medium)

Current: IN-APP chat between student and tutor (FR-TH-05)

**Decision:**
- **Option A: Polling** — simple, no infra (start here, Phase 1)
- **Option B: SSE** — one-way server→client (good for notifications)
- **Option C: WebSocket** — bidirectional (Phase 2, if needed for live collaboration)

Recommendation: **Start with polling** in Phase 1. Upgrade to WebSocket in Phase 2 if student/tutor feedback shows lag.

### 3. Background Jobs (Payout Batches)

**Skill Section:** [Section 8](./SKILL.md#8-background-jobs--async-medium)

Current: Phase 1 = manual payout 2x/month (FR-PM-06)

**Decision:**
- Phase 1: Scheduled cron job + manual approval
- Phase 2: BullMQ + Redis for auto-payout batches (per skill)

### 4. File Upload (KYC Images, Sheets)

**Skill Section:** [Section 10](./SKILL.md#10-file-upload-patterns-medium)

Current: Upload KYC (ID, selfie, transcript), sheets, payment slips

**Decision:**
- **Option A: Presigned URL** (recommended for large files, S3/R2)
  - KYC images: ~2-5 MB
  - Sheets: ~5-50 MB
  - ✅ Recommended
- **Option B: Multipart** (simple, server hit)
  - If < 10 MB and infrastructure is tight

---

## How to Use This Skill

### For Architecture Review

1. Open [./SKILL.md](./SKILL.md)
2. Jump to the relevant section (use Quick Navigation table)
3. Compare your code against the pattern
4. Refactor using the provided examples

### For Building New Features

Follow the workflow in [Section 0 of SKILL.md](./SKILL.md#step-0-gather-requirements):

```
Step 0: Gather Requirements
  ↓
Step 1: Architectural Decisions
  ↓
Step 2: Scaffold with Checklist
  ↓
Step 3: Implement Following Patterns
  ↓
Step 4: Test & Verify
  ↓
Step 5: Handoff Summary
```

### For Reference Deep-Dives

When you need detailed guidance on a specialized topic:

| Topic | Reference |
|-------|-----------|
| REST API Design (endpoints, status codes, pagination) | [references/api-design.md](./references/api-design.md) |
| JWT Auth flow, token refresh, RBAC | [references/auth-flow.md](./references/auth-flow.md) |
| Database schema, migrations, indexes | [references/db-schema.md](./references/db-schema.md) |
| CORS, env vars per environment | [references/environment-management.md](./references/environment-management.md) |
| Unit, integration, e2e, contract, perf testing | [references/testing-strategy.md](./references/testing-strategy.md) |
| 6-gate release checklist | [references/release-checklist.md](./references/release-checklist.md) |
| Tech stack selection criteria | [references/technology-selection.md](./references/technology-selection.md) |

---

## PEERAHAT-Specific Guidelines

These are already in your [CLAUDE.md](../../CLAUDE.md):

```
✅ Frontend never contains business logic
✅ All DTOs live in /packages/types
✅ Use Thai for user-facing copy, English for code/comments
✅ Reference FR-IDs from requirements.md in every commit
✅ Phase 1 only — do not implement Phase 2 features
```

**Alignment with Fullstack-Dev Skill:**

1. **"Frontend never contains business logic"** ← Aligns with Skill Section 1, Controller rule
2. **"All DTOs live in /packages/types"** ← Aligns with Skill Section 12 (shared types)
3. **"Use Thai for user-facing copy, English for code/comments"** ← Follows clean code principle
4. **"Reference FR-IDs in commits"** ← Traceability (audit trail concept, Section 7)
5. **"Phase 1 only"** ← Scope management (don't gold-plate)

---

## Hooks for Integration

> These files should reference the skill when implementing PEERAHAT features:

**Backend Controllers** (src/*/\*.controller.ts)
- Section 1: Thin controllers, business logic → service
- Section 6: Auth middleware order

**Backend Services** (src/*/\*.service.ts)
- Section 1: Service contains business logic, no HTTP types
- Section 8: If background jobs involved

**Database Layer** (Prisma)
- Section 4: N+1 prevention, transactions, migrations
- [references/db-schema.md](./references/db-schema.md): Schema design

**Config** (src/config/)
- Section 2: Env var validation, fail-fast
- [references/environment-management.md](./references/environment-management.md)

**Frontend** (apps/web/lib/, components/)
- Section 5: API client patterns
- Section 12: Cross-boundary error handling
- [references/auth-flow.md](./references/auth-flow.md): JWT refresh, login flow

**Testing**
- [references/testing-strategy.md](./references/testing-strategy.md): Unit → integration → e2e

**Deployment / Production**
- Section 13: Health checks, graceful shutdown, security
- [references/release-checklist.md](./references/release-checklist.md): Pre-launch gates

---

## FAQ

**Q: Does the skill apply to both NestJS + Next.js?**  
A: Yes. The skill is language/framework-agnostic. Sections 1–3, 6–13 apply to any full-stack app. Sections 4–5 have TypeScript examples but principles apply to Django, Go, Python, etc.

**Q: Should I refactor PEERAHAT now to match the skill?**  
A: No. The skill is a **guide for new features and future refactors**, not a mandate to rewrite existing code. Use it as a reference when:
- Building new modules (chat, payments, community)
- Fixing bugs (integrate the error handling pattern)
- Hardening for production (Section 13)

**Q: Is everything in the skill required?**  
A: No. Principles 1–7 are mandatory. Sections 8–11 are optional depending on your needs (e.g., skip Section 8 if no async jobs). Follow the "SCOPE" section in SKILL.md.

**Q: What if the skill contradicts CLAUDE.md?**  
A: CLAUDE.md wins (project-specific). But in most cases, they align. Example: "Frontend never contains business logic" = Skill Section 1's Controller rule.

---

## File Structure After Installation

```
PEERAHAT/
├── .skill/
│   └── fullstack-dev/
│       ├── SKILL.md                          ← Main skill document (1000+ lines)
│       ├── PEERAHAT-INTEGRATION.md           ← This file
│       ├── PEERAHAT-CHECKLIST.md             ← Implementation TODO checklist
│       └── references/
│           ├── api-design.md
│           ├── auth-flow.md
│           ├── db-schema.md
│           ├── django-best-practices.md      ← (not needed for PEERAHAT)
│           ├── environment-management.md
│           ├── release-checklist.md
│           ├── technology-selection.md
│           └── testing-strategy.md
├── apps/api/
│   └── src/
│       └── common/
│           ├── errors/                       ← Create per Section 3
│           ├── health/                       ← Create per Section 13
│           └── config/                       ← Audit per Section 2
├── apps/web/
│   ├── lib/
│   │   └── api-client.ts                     ← Review per Section 5
...
```

---

## Next Steps

1. **Read SKILL.md sections in priority order** (listed above)
2. **Review PEERAHAT-CHECKLIST.md** — track implementation progress
3. **Start with Section 3 (Error Handling)** — highest impact, enables other improvements
4. **Reference § in commit messages** when applying skill patterns

---

** End of PEERAHAT Integration Guide**

For questions or clarifications, refer back to the skill document or specific reference guides.

