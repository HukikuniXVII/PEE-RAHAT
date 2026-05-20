# PeeRahat — Pages & Functions Reference

> Use this document when designing UI for any page.  
> It tells you what each page does, what it shows, and what logic must be kept.

## Auth Level Legend

| Symbol | Meaning |
|--------|---------|
| 🌐 | Public — no login required |
| 🔐 | Authenticated — redirects to `/login` if not logged in |
| 🛡️ | Admin only — requires `role === "admin"` |

---

## Landing & Auth Pages

### `/` — Landing Page
- **File:** `apps/web/app/page.tsx`
- **Auth:** 🌐 (redirects logged-in users → `/tutors`)
- **Purpose:** Marketing page — introduces the platform to new visitors
- **Layout:** 3-section full-screen snap scroll (`snap-y mandatory`)
  - Section 1: Hero — headline, feature cards, CTAs
  - Section 2: About + Features grid
  - Section 3: How It Works (5 steps)
- **Components (design-only, safe to replace):**
  - `components/landing/Nav.tsx` — nav bar (Josefin Sans, frosted glass)
  - `components/landing/Hero.tsx` — hero content
  - `components/landing/AboutFeatures.tsx` — about + 4 feature cards
  - `components/landing/HowItWorks.tsx` — 5-step timeline
  - `components/snap-lock.tsx` — locks body scroll (keep this)
- **Business logic:** Only the `getInitialUser()` auth check in `page.tsx`

---

### `/login` — Login
- **File:** `apps/web/app/login/page.tsx`
- **Auth:** 🌐 (redirects logged-in users away)
- **Purpose:** Sign in via email/password or Google/Facebook/Apple OAuth
- **Layout:** Full-screen split card — mascot left, form right
- **Components:**
  - `packages/ui/src/components/auth-card.tsx` — card layout ✏️ *edit for design*
  - `packages/ui/src/components/page-background.tsx` — background ✏️ *edit for design*
  - `apps/web/app/login/_components/login-form.tsx` — ⚠️ **contains Supabase auth logic, do not replace**
- **Business logic in:** `login-form.tsx` — Supabase signIn, Google OAuth, error handling

---

### `/signup` — Sign Up
- **File:** `apps/web/app/signup/page.tsx`
- **Auth:** 🌐 (redirects logged-in users away)
- **Purpose:** Register new account (username, email, password, confirm password, terms)
- **Layout:** Identical split card to login
- **Components:**
  - Same `AuthCard` + `PageBackground` as login
  - `apps/web/app/signup/_components/signup-form.tsx` — ⚠️ **contains Supabase signUp, password strength logic, do not replace**
- **Business logic in:** `signup-form.tsx` — Supabase signUp, zod validation, password strength meter

---

## App Pages — Public

### `/tutors` — Tutor Directory
- **File:** `apps/web/app/tutors/page.tsx`
- **Auth:** 🌐
- **Purpose:** Browse and search verified tutors; filter by subject, price, rating
- **Layout:** Page header (hero) + search/filter UI + infinite-scroll card grid
- **Components:**
  - `page.tsx` — hero heading + initial data fetch ✏️ *safe to redesign*
  - `_components/tutor-search.tsx` — ⚠️ **infinite scroll, filter state, debounced search**
  - `_components/filter-sidebar.tsx` — ⚠️ **filter state logic**
  - `_components/tutor-card.tsx` — ✏️ *card UI can be restyled*
- **Business logic in:** `tutor-search.tsx`, `filter-sidebar.tsx`

---

### `/tutors/[id]` — Tutor Profile
- **File:** `apps/web/app/tutors/[id]/page.tsx`
- **Auth:** 🌐 (booking requires login)
- **Purpose:** Full tutor profile with intro video, subjects, reviews, and booking
- **Key features:** sticky mobile booking bar, sidebar booking on desktop
- **Components (all contain logic — do not replace, only restyle):**
  - `_components/intro-video.tsx` — video player
  - `_components/availability-picker.tsx` — calendar slot picker
  - `_components/reviews-section.tsx` — paginated reviews
  - `_components/booking-cta.tsx` — book button (sidebar + mobile variants)
  - `_components/chat-cta.tsx` — message button
- **Business logic in:** all `_components/`, React Query hydration in `page.tsx`

---

### `/sheets` — Sheet Marketplace
- **File:** `apps/web/app/sheets/page.tsx`
- **Auth:** 🌐
- **Purpose:** Browse and buy study sheets uploaded by tutors
- **Layout:** Page header + search/filter + infinite-scroll grid
- **Components:**
  - `page.tsx` — hero heading + stats card ✏️ *safe to redesign*
  - `_components/sheet-grid.tsx` — ⚠️ **infinite scroll, filter, report + purchase logic**
- **Business logic in:** `sheet-grid.tsx`

---

### `/sheets/[id]` — Sheet Detail
- **File:** `apps/web/app/sheets/[id]/page.tsx`
- **Auth:** 🌐 (purchase requires login)
- **Purpose:** View sheet details, preview, and purchase
- **Components:**
  - `_components/sheet-detail.tsx` — ⚠️ **purchase mutation, report mutation**
- **Business logic in:** `sheet-detail.tsx`

---

### `/tcas` — TCAS Calculator
- **File:** `apps/web/app/tcas/page.tsx`
- **Auth:** 🌐
- **Purpose:** What-if score calculator — enter exam scores, see which university programs you qualify for
- **Components:**
  - `_components/tcas-calculator.tsx` — ⚠️ **extremely complex: score mapping, multi-exam system logic, eligibility computation**
- **Business logic in:** entire `tcas-calculator.tsx` — do not touch
- **Design approach:** Only restyle via shared `Button`, `Input`, `Card` components

---

### `/community` — Discussion Board
- **File:** `apps/web/app/community/page.tsx`
- **Auth:** 🌐 (posting requires login)
- **Purpose:** TCAS student forum for questions and discussion
- **Components:**
  - `page.tsx` — heading ✏️ *safe to redesign*
  - `_components/community-feed.tsx` — ⚠️ **infinite scroll posts**
  - `_components/post-composer.tsx` — ⚠️ **post mutation**
  - `_components/post-card.tsx` — ⚠️ **reply/delete mutations**
- **Business logic in:** all `_components/`

---

### `/contact` — Contact Us
- **File:** `apps/web/app/contact/page.tsx`
- **Auth:** 🌐
- **Purpose:** Static contact info — email addresses, phone, office address
- **Business logic:** None ✅ **100% safe to redesign**

---

### `/help` — FAQ
- **File:** `apps/web/app/help/page.tsx`
- **Auth:** 🌐
- **Purpose:** Frequently asked questions about escrow, payments, cancellations
- **Business logic:** None ✅ **100% safe to redesign**

---

### `/legal/privacy` — Privacy Policy
- **File:** `apps/web/app/legal/privacy/page.tsx`
- **Auth:** 🌐
- **Purpose:** PDPA (Thai privacy law) compliance document
- **Business logic:** None ✅ **100% safe to redesign**

---

### `/legal/terms` — Terms of Service
- **File:** `apps/web/app/legal/terms/page.tsx`
- **Auth:** 🌐
- **Purpose:** Platform terms covering KYC, escrow, contact restrictions
- **Business logic:** None ✅ **100% safe to redesign**

---

### `/offline` — Offline Fallback
- **File:** `apps/web/app/offline/page.tsx`
- **Auth:** 🌐
- **Purpose:** Shown by the PWA service worker when there is no internet connection
- **Business logic:** None ✅ **100% safe to redesign**

---

## App Pages — Authenticated

### `/tutors/onboarding` — Tutor Onboarding
- **File:** `apps/web/app/tutors/onboarding/page.tsx`
- **Auth:** 🔐
- **Purpose:** Multi-step form for a user to become a tutor — subjects, bio, rates, bank account, KYC documents
- **Components:**
  - `_components/onboarding-flow.tsx` — ⚠️ **multi-step form with file uploads and API mutations**
- **Business logic in:** `onboarding-flow.tsx`

---

### `/tutors/me/edit` — Edit Tutor Profile
- **File:** `apps/web/app/tutors/me/edit/page.tsx`
- **Auth:** 🔐 (must be a tutor)
- **Purpose:** Edit display name, avatar, bio, subjects, hourly rate, intro video; sync Google Calendar
- **Components:**
  - `_components/profile-edit-form.tsx` — ⚠️ **profile update mutations, avatar upload**
  - `_components/google-calendar-card.tsx` — ⚠️ **OAuth calendar sync**
  - `_components/bank-status-banner.tsx` — ✏️ *UI only*
- **Business logic in:** `profile-edit-form.tsx`, `google-calendar-card.tsx`

---

### `/tutors/me/bank` — Bank Account
- **File:** `apps/web/app/tutors/me/bank/page.tsx`
- **Auth:** 🔐 (must be a tutor)
- **Purpose:** Add/update bank account for receiving payouts (scheduled 15th & 30th)
- **Components:**
  - `_components/bank-edit-card.tsx` — ⚠️ **bank account mutation**
- **Business logic in:** `bank-edit-card.tsx`

---

### `/tutors/[id]/book` — Book a Tutor
- **File:** `apps/web/app/tutors/[id]/book/page.tsx`
- **Auth:** 🔐
- **Purpose:** Schedule a class — pick date/time, select subject, confirm booking
- **Components:**
  - `_components/booking-form.tsx` — ⚠️ **booking creation mutation, time slot logic, PromptPay QR generation**
- **Business logic in:** `booking-form.tsx`

---

### `/bookings` — My Schedule
- **File:** `apps/web/app/bookings/page.tsx`
- **Auth:** 🔐
- **Purpose:** View all booked classes in calendar view or list view; different labels for students vs tutors
- **View modes:** `?view=schedule` (calendar grid 8am–11pm) or `?view=list`
- **Components:**
  - `page.tsx` — role-based heading ✏️ *safe to redesign*
  - `_components/view-toggle.tsx` — ✏️ *toggle UI safe to restyle*
  - `_components/schedule-view.tsx` — ⚠️ **complex calendar math, week navigation**
  - `_components/bookings-list.tsx` — ⚠️ **booking list with actions**
  - `_components/booking-row.tsx` — ✏️ *row UI can be restyled*
  - `_components/postpone-reason-dialog.tsx` — ⚠️ **postpone mutation**
  - `_components/report-dialog.tsx` — ⚠️ **report mutation**
  - `_components/review-dialog.tsx` — ⚠️ **review mutation**
- **Business logic in:** `schedule-view.tsx`, `bookings-list.tsx`, all dialogs

---

### `/chat` — Chat Thread List
- **File:** `apps/web/app/chat/page.tsx`
- **Auth:** 🔐
- **Purpose:** List of all open conversations with tutors
- **Components:**
  - `page.tsx` — heading ✏️ *safe to redesign*
  - `_components/threads-list.tsx` — ⚠️ **real-time refetch, unread badge logic**
- **Business logic in:** `threads-list.tsx`

---

### `/chat/[id]` — Chat with Tutor
- **File:** `apps/web/app/chat/[id]/page.tsx`
- **Auth:** 🔐
- **Purpose:** Open or create a conversation with a specific tutor (by tutor profile ID)
- **Guards:** Prevents chatting with yourself (redirects to `/chat`)
- **Components:**
  - `_components/chat-room.tsx` — ⚠️ **real-time messages, typing indicators, slot proposals**
- **Business logic in:** `chat-room.tsx`, auth guard in `page.tsx`

---

### `/chat/thread/[threadId]` — Chat Thread by ID
- **File:** `apps/web/app/chat/thread/[threadId]/page.tsx`
- **Auth:** 🔐
- **Purpose:** Open a specific thread by its ID (used by internal links from notifications)
- **Components:** Same `ChatRoom` as above — ⚠️ **do not replace**

---

### `/sheets/upload` — Upload Sheet
- **File:** `apps/web/app/sheets/upload/page.tsx`
- **Auth:** 🔐
- **Purpose:** Tutors upload PDF study sheets with title, subject, price for sale
- **Components:**
  - `_components/sheet-upload-form.tsx` — ⚠️ **file upload + S3, form validation, sheet creation mutation**
- **Business logic in:** `sheet-upload-form.tsx`

---

## Admin Pages

> All admin pages are protected by `requireAdmin()`. Layout wraps in `AdminShell`.  
> **Approach:** Restyle via `Button`, `Card`, `Input` components from `@peerahat/ui`. Do not rewrite `_components/`.

### `/admin/kyc` — KYC Queue
- **File:** `apps/web/app/admin/kyc/page.tsx`
- **Purpose:** List of tutors awaiting identity verification (ID card, selfie, bank passbook)
- **Core component:** `_components/kyc-queue.tsx` ⚠️

### `/admin/kyc/[id]` — KYC Review
- **File:** `apps/web/app/admin/kyc/[id]/page.tsx`
- **Purpose:** View submitted documents and approve/reject a KYC submission
- **Core component:** `_components/review-form.tsx` ⚠️

### `/admin/payments` — Payment Verification
- **File:** `apps/web/app/admin/payments/page.tsx`
- **Purpose:** Review student payment slips via SlipOK API; queues for pending/success/failed
- **Core component:** `_components/payments-table.tsx` ⚠️

### `/admin/payouts` — Tutor Payouts
- **File:** `apps/web/app/admin/payouts/page.tsx`
- **Purpose:** Manage scheduled payouts to tutors (15th & 30th of month)
- **Core component:** `_components/payouts-table.tsx` ⚠️

### `/admin/payouts/[id]` — Payout Detail
- **File:** `apps/web/app/admin/payouts/[id]/page.tsx`
- **Purpose:** View full details of a single payout
- **Core component:** `_components/payout-detail.tsx` ⚠️

### `/admin/reports` — Dispute Reports
- **File:** `apps/web/app/admin/reports/page.tsx`
- **Purpose:** Handle student dispute reports that affect escrow release
- **Core component:** `_components/reports-table.tsx` ⚠️

### `/admin/tutors/[id]` — Tutor Audit
- **File:** `apps/web/app/admin/tutors/[id]/page.tsx`
- **Purpose:** Full audit view of a tutor — profile, bank, complete transaction passbook
- **Core component:** `components/admin-passbook-block.tsx` ⚠️ (global component)

### `/admin/tcas/import/criteria` — TCAS AI Import
- **File:** `apps/web/app/admin/tcas/import/criteria/page.tsx`
- **Purpose:** Upload TCAS PDF → AI extracts program criteria → admin reviews/edits → confirms save
- **Core component:** `_components/criteria-ai-import-client.tsx` ⚠️ **complex AI + file pipeline**
