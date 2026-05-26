# Refactor Plan

Generated from a whole-project audit on `main` (post-merge of feature branches into main as of 2026-05-26). 20 findings grouped into 11 PRs, sequenced by risk-then-leverage.

## Summary

| # | PR | Effort | What it does |
|---|---|---|---|
| 1 | Quick wins | ½d | Dedupe `readPositiveInt`, `signEvidence`, `dateStringSchema`; delete dead `ReportIssueDto`; type `audit-log` returns |
| 2 | Bank masking | ½d | `cryptoService.maskedAccountLast4()` so masking can't be forgotten |
| 3 | Reports tidy | ½d | Shared `REPORT_CLOSED_STATUSES` + `REPORT_STATUS_LABELS` instead of hardcoded literals |
| 4 | PromptPay extraction | ½d | Pure module for `buildPromptPayPayload` — breaks the documented circular-dep hack |
| 5 | `requireUser` helper | ½d | Replace 16 inline `findUnique({ supabaseId })` lookups across bookings + group-session |
| 6 | Upload via api-client | 1d | New `api.uploads.putPresigned()`; migrate 6 components that currently `fetch()` direct |
| 7 | `useMutationWithToast` hook | 1–2d | Touches 22 frontend files; biggest cross-cutting win |
| 8 | Auth guards + jobs | 1d | Unify `AuthGuard`/`AdminGuard` user lookup; pull `assertAdmin` out of the controller; `registerJob()` helper for the 7 queues |
| 9 | Type-casts + enum imports | 1d | Backend Prisma narrowing; frontend `lib/routes.ts` typed builders (start with `site-nav.tsx`'s 17 casts); fix inline status unions in `api-client.ts` |
| 10 | Notifications + avatar | 1d | `notifyGroupEvent()` helper; shared `<AvatarUploadField>` |
| 11 | Split `group-session.service` (1000 lines) | 1–2d | **Deferred** until subsystem stabilizes |

**Total: ~8 days to clear 19 of 20 findings. PR 11 deferred.**

---

## PR 1 — Quick wins (extractions + dead code)

**Why first**: trivial diffs, no behavior change, no cross-cutting impact. Clears the smallest items in one sweep.

**Findings**: #2, #6, #16, #20, #19

| # | What | Files touched |
|---|------|---|
| 2 | `readPositiveInt` → `apps/api/src/common/env.ts` | 4 reports services |
| 6 | `signEvidence` → `StorageService.signEvidenceUrls()` | `reports.service.ts`, `admin-reports.service.ts`, `storage.service.ts` |
| 16 | `dateStringSchema` → single export | `packages/types/src/admin.ts`, `payment.ts` |
| 20 | Delete `ReportIssueDto`; privatize `normalizeName` | `packages/types/src/payment.ts`, `kyc.service.ts` |
| 19 | Type `audit-log.service.ts` return values | `common/audit-log.service.ts` |

**Verify**: `npx tsc --noEmit` in both apps.

---

## PR 2 — Bank-account masking helper

**Why second**: only safety-relevant item that's still S-effort. Eliminates the "what if someone forgets `.slice(-4)`" class of bug.

**Findings**: #3

**Steps**:
1. Add to `apps/api/src/common/crypto.service.ts`:
   - `maskedAccountLast4(encrypted: string): string`
2. Migrate the 3 verified `slice(-4)` sites: `payouts.service.ts:175`, `tutors.service.ts:422, 453`.
3. Audit `admin.service.ts` for the wider 6+ decrypt-and-project pattern; migrate any that mask.

**Verify**: typecheck + grep for `.slice(-4)` to confirm no other call sites remain.

---

## PR 3 — Reports system tidy-up

**Why third**: reports is the newest subsystem; tidying now keeps it consistent before more code lands.

**Findings**: #9, #18

**Steps**:
1. Export `REPORT_CLOSED_STATUSES` from `packages/types/src/reports.ts`.
2. Migrate `admin-reports.service.ts:27`, `report-resolution.service.ts:65`, `report-cron.service.ts:54,106,108` to use it.
3. Import `REPORT_STATUS_LABELS` into `admin-reports.service.ts:262,304`; replace inline Thai strings.

**Verify**: typecheck + manually trigger a status change in admin UI.

---

## PR 4 — Bookings/payments boundary fix

**Why fourth**: small but resolves an explicitly-flagged workaround.

**Findings**: #8

**Steps**:
1. Create `apps/api/src/payments/promptpay.ts` exporting `buildPayload(amountThb)` as a pure function.
2. `payments.service.ts` and `group-session.service.ts:992` both import it.
3. Delete the duplicated logic in group-session; reference promptpay.ts in the comment.

**Verify**: typecheck + create one group booking end-to-end.

---

## PR 5 — User-lookup helper

**Why fifth**: foundational helper later PRs may reuse. Mechanical, low risk.

**Findings**: #7

**Steps**:
1. Add `private async requireUser(supabaseId: string): Promise<User>` to a shared location.
2. Migrate 8 sites in `group-session.service.ts` + 8 in `bookings.service.ts`.
3. Standardize the error message.

**Verify**: typecheck. Spot-check 2–3 endpoints surfacing "User not found".

---

## PR 6 — Upload via api-client

**Why sixth**: enables PR 7's `useMutationWithToast` migration to cleanly cover upload flows.

**Findings**: #5

**Steps**:
1. Add `api.uploads.putPresigned(intent, file)` to `lib/api-client.ts`. Mirror the 401-refresh path already in `requestMultipart`.
2. Migrate 6 components:
   - `sheets/upload/_components/sheet-upload-form.tsx`
   - `profile/_components/profile-edit-form.tsx`
   - `tutors/me/bank/_components/bank-edit-card.tsx`
   - `tutors/me/edit/_components/profile-edit-form.tsx`
   - `tutors/onboarding/_components/identity-section.tsx`
   - `tutors/onboarding/_components/onboarding-flow.tsx`

**Verify**: manually test one upload from each surface.

---

## PR 7 — `useMutationWithToast` hook

**Why seventh**: biggest cross-cutting win.

**Findings**: #1

**Steps**:
1. Add `apps/web/lib/hooks/use-mutation-with-toast.ts` accepting `{ mutationFn, successMessage, errorMessage?, invalidateKeys?, refreshRouter? }`.
2. Migrate in batches by directory: `admin/` → `tutors/` → `bookings/` → `chat/` → `profile/` → misc.
3. Drop now-unused `useMutation` imports where only used with toasts.

**Verify**: per-batch typecheck; manually exercise one mutation per directory.

---

## PR 8 — Auth guards + jobs

**Why eighth**: clusters related backend coupling fixes.

**Findings**: #12, #14, #13

**Steps**:
1. **#12 + #14**: Create `AuthService.loadCurrentUser(supabaseId)` returning `{ id, role, suspendedUntil }`. Refactor `auth.guard.ts` and `admin.guard.ts` to use it. Move `assertAdmin` out of `admin.controller.ts` (delete the `PrismaService` injection).
2. **#13**: Refactor `jobs.service.ts` to use a `registerJob<T>(name, cron, handler)` helper. Migrate the 7 queue/worker pairs.

**Verify**: typecheck. Hit one admin endpoint and one cron job.

---

## PR 9 — Type-casts + enum imports

**Why ninth**: depends on earlier helpers being in place.

**Findings**: #4, #17

**Steps**:
1. Backend cast cleanup (#4 backend half): tighten Prisma `select`s or `z.enum(...).parse()` at the read boundary.
2. Frontend `lib/routes.ts` typed builders (#4 frontend half): migrate `site-nav.tsx` first (17 casts). Defer the long tail.
3. #17: Replace inline status unions in `api-client.ts:265-276, 302` with imports from `packages/types`.

**Verify**: typecheck. No URLs should change.

---

## PR 10 — Notification dispatch + avatar field

**Findings**: #10, #15

**Steps**:
1. #10: Add `private notifyGroupEvent(bookingId, eventType, context)` to `group-session.service.ts`. Migrate 7 inline `notify()` call sites.
2. #15: Extract `<AvatarUploadField>` shared component. Use in both `profile-edit-form.tsx` files. Leave the rest of each form intact.

**Verify**: accept/decline a group invite. Avatar uploads on both profile pages.

---

## PR 11 — Split `group-session.service` (deferred)

**Why last**: largest structural change; defer until subsystem stops evolving.

**Findings**: #11

**Steps**:
1. Split into `InviteService`, `GroupApprovalService`, `GroupSessionPresenter`.
2. Move helpers from #5/#7/#8/#10 PRs into the correct sub-service.
3. Update `bookings.module.ts` providers.

**Verify**: full booking-with-group flow end-to-end.

---

## Sequencing rules

- PR 1, 2, 3 can land in any order (no overlap).
- PR 4 should land before PR 5 (both touch `group-session.service.ts`).
- PR 6 should land before PR 7 (cleaner upload migration).
- PR 11 waits until PRs 5, 8, 10 are in.

## Excluded by design

- Test coverage (separate pass).
- `payment-dialog.tsx` graduation to `packages/ui` (usage-driven; defer).
- `audit-log` table redesign (schema migration, not refactor).

## Verified headline counts on `main` (2026-05-26)

- `toast.success/error` in `useMutation` blocks: **22 files**
- `readPositiveInt` byte-identical copies: **4**
- Bank `slice(-4)` masking sites: **3** direct; **6+** broader decrypt-and-project pattern
- Type casts (`as BankName | UserRole | Route` etc.): **75+** across both apps; `as Route` concentrated in `site-nav.tsx` (17)
- Presigned-URL `fetch()` bypassing api-client: **6 files**
- User `findUnique({ supabaseId })` lookups in bookings: **16 sites** across two services
