# Pee Rahat — Requirements & Implementation Plan

**Document type:** Business Requirements + Technical Plan
**Author:** Business Analyst
**Status:** Draft v1.0
**Source:** Pee Rahat Document (1).docx

---

## 1. Executive Summary

Pee Rahat is a Thai EdTech marketplace platform connecting high school students preparing for **TCAS (Thai University Central Admission System)** with verified university student tutors. The platform combines four core pillars: **Tutor Hub**, **Sheet Marketplace**, **TCAS Calculator**, and **Community** — unified by an **escrow-based payment system** to build trust between students, parents, and tutors.

**Key differentiators (USP):**
- Verified tutors via KYC (National ID + Transcript)
- Escrow payment with 100% refund guarantee
- TCAS What-If algorithm with upsell to tutors
- Diagnostic quiz to match weakness → tutor
- Verified-only reviews (must complete a paid class)

**Target users:** Thai high school students (M.4–M.6), university students (as tutors), parents.

---

## 2. Stakeholders & Personas

| Persona | Goals | Pain Points |
|---|---|---|
| **Student (น้อง)** | Get into target faculty, find trusted tutor, know exactly what score gap to close | Can't verify tutor credentials, scared of being scammed, doesn't know which subject is weak |
| **Parent** | Ensure money is safe, child is studying with legitimate tutor | No transparency, no recourse if tutor disappears |
| **Tutor (พี่)** | Earn income, build reputation, save time on admin | Marketing themselves is hard, students ghost after free trial, no protection from scam students |
| **Admin (Pee Rahat staff)** | Verify KYC, review disputes, manage payouts (esp. in Phase 1 manual ops) | Manual workload, tutor-student bypass attempts |

---

## 3. Clarifying Questions (BA Flags Before Build)

> The source doc is feature-rich but several decisions are unspecified. These should be answered before sprint planning.

1. **Single-country scope?** Document is Thailand-focused (TCAS, PromptPay, ภาษา ไทย). Confirm no plans for inter-school / English-medium expansion in Phase 1–2.
2. **Mobile-first or web-first?** Target users are Gen Z students — TikTok-native, mobile-heavy. Recommend mobile-first responsive web (PWA) before native app.
3. **Live class delivery in MVP?** Document defers video infra to Phase 2 (use Google Meet / Discord externally). Confirm this is acceptable for launch.
4. **Tutor onboarding — automated or manual KYC?** Phase 1 should be manual admin review; OCR + ID verification API is Phase 2.
5. **Pricing model for sheets** — fixed by seller, or capped range by platform?
6. **Refund window length?** Document mentions 24-hour report button — is that the SLA?

---

## 4. Functional Requirements

> Prioritized using **MoSCoW**. Phase mapping in §7.

### 4.1 Tutor Hub

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| FR-TH-01 | Diagnostic quiz: student answers 10–20 questions per subject; system identifies weak topics and recommends tutors | Must | 1 |
| FR-TH-02 | Tutor KYC: upload National ID photo + selfie + Transcript or score report; admin manually approves; verified tutors receive a **Badge** | Must | 1 |
| FR-TH-03 | Tutor profile page: bio, subjects taught, university/faculty, hourly rate, sample intro video, reviews, badges | Must | 1 |
| FR-TH-04 | Search & filter tutors by subject, price range, university, rating, availability | Must | 1 |
| FR-TH-05 | In-app chat between student and tutor | Must | 1 |
| FR-TH-06 | Booking flow: student requests slot → tutor accepts within 24h → student pays → booking confirmed (Manual-Accept model) | Must | 1 |
| FR-TH-07 | Calendar / availability sync (Google Calendar import, recurring slots) | Should | 2 |
| FR-TH-08 | In-platform video classroom with recording, retained for student review and dispute evidence | Should | 2 |
| FR-TH-09 | Review & rating: only students who completed and paid for a class can submit; 1–5 stars + text | Must | 1 |
| FR-TH-10 | Postpone-class entry: student or tutor can request to postpone a paid booking before `scheduledAt`; opens a 2-hour negotiation chat thread | Must | 1 |
| FR-TH-11 | Refund-split policy on postpone cancellation: short-notice student-initiated → 50% tutor / 10% platform fee / 40% student refund; tutor-unresponsive or tutor-initiated-declined → 100% student refund; all amounts via `RefundPolicyService` with env-driven percentages | Must | 1 |
| FR-TH-12 | Postpone negotiation chat: initiator can propose a new slot (≥24h ahead); counterparty can accept (clone booking + keep escrow) or decline (refund path); system messages logged for open/propose/confirm/cancel/timeout | Must | 1 |
| FR-TH-13 | Postpone timeout worker: BullMQ job fires at `chatExpiresAt` (2h); resolver classifies outcome by whether the counterparty messaged after `PostponeRequest.createdAt`, then runs the cancellation+refund path | Must | 1 |
| FR-TH-14 | Tutor defect ranking: `TutorProfile.defectCount` increments on tutor-unresponsive or tutor-initiated-decline outcomes; tutor search deprioritizes tutors with `defectCount >= 3` | Must | 1 |
| FR-TH-17 | Auto-generated Google Meet link at class start: a BullMQ worker fires at `scheduledAt − GOOGLE_MEET_LEAD_MINUTES` for paid bookings, calls Google Calendar API (`events.insert` with `conferenceData`) under a platform service account to create the Meet, persists `meetLink` + `googleCalendarEventId` on the booking, and posts a system chat message with the link. Postpone-confirm deletes the old event and re-enqueues. When `GOOGLE_MEET_ENABLED=false` the worker posts a fallback message. Bridges the §11 "use Google Meet externally" gap without implementing in-platform video (FR-TH-08 stays Phase 2). | Must | 1 |

### 4.2 Sheet Marketplace

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| FR-SM-01 | Tutor uploads PDF sheet with title, subject, price, preview pages, intro video | Must | 1 |
| FR-SM-02 | Buyer purchases sheet; receives downloadable PDF after payment confirmation | Must | 1 |
| FR-SM-03 | Display seller credentials (university, faculty, ranking) on sheet listing | Must | 1 |
| FR-SM-04 | Automatic watermarking: buyer's name/email stamped on every page of delivered PDF | Should | 2 |
| FR-SM-05 | Bounty system: students post requests for sheet topics; tutors fulfill | Could | 2 |
| FR-SM-06 | Bundle pricing: sheet + tutoring session at discount | Could | 2 |
| FR-SM-07 | Copyright takedown: "Report infringement" button on every sheet page; auto-suspend on report pending review | Must | 1 |

### 4.3 TCAS Calculator

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| FR-TC-01 | Score input: TGAT, TPAT, A-Level, GPA fields by subject | Must | 1 |
| FR-TC-02 | Faculty/program database with required score weights (TCAS rounds 1–4) | Must | 1 |
| FR-TC-03 | What-If reverse algorithm: given target faculty + current scores, output exact score gap per subject | Must | 1 |
| FR-TC-04 | Upsell CTA: "Tutor for [Subject]" button beside each score gap, deeplink to filtered tutor list | Must | 1 |
| FR-TC-05 | Plan B suggestions: if scores insufficient for target, suggest 3–5 nearest reachable faculties | Should | 2 |
| FR-TC-06 | Deadline tracker: TCAS application/exam dates, push notifications | Should | 2 |

### 4.4 Community

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| FR-CM-01 | Web board: post questions, threaded replies, upvote | Must | 1 |
| FR-CM-02 | Profile badges showing university + faculty + alumni status | Must | 1 |
| FR-CM-03 | Tagged questions (#ถามพี่หมอ, #ถามพี่บัญชี) routed to notifications of matching faculty users | Should | 2 |
| FR-CM-04 | Sub-rooms (Discord-style) per faculty/university for peer study | Could | 2 |
| FR-CM-05 | Report inappropriate post button (PDPA + Computer Crime Act compliance) | Must | 1 |

### 4.5 Payment & Escrow

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| FR-PM-01 | **Phase 1 (Manual):** student transfers via PromptPay QR to platform bank account; uploads slip; Slip Verification API (SlipOK) checks authenticity; admin approves | Must | 1 |
| FR-PM-02 | **Phase 2 (Automated):** Stripe Connect / Opn Payments integration with auto-split (commission to platform, payout to tutor) | Must | 2 |
| FR-PM-03 | Escrow holding: funds held until class completion or sheet download confirmed | Must | 1 |
| FR-PM-04 | Tiered commission: 20% (0–20 hrs) → 17% (21–100) → 15% (101–300) → 12% (300+) | Should | 2 |
| FR-PM-05 | Report-issue button active 24h after class; triggers admin freeze and review | Must | 1 |
| FR-PM-06 | Payout schedule: 15th and 30th of each month (batched) | Must | 1 |
| FR-PM-07 | Withholding tax 3% deducted from tutor payout per Thai tax law | Must | 1 |
| FR-PM-08 | Anti-bypass chat filter: regex block for "Line", "ไอจี", "เบอร์โทร", 10-digit numbers | Must | 1 |
| FR-PM-09 | Study-to-Earn loyalty points for in-platform payments | Could | 2 |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | **Performance** | Page load under 3s on 4G; tutor search returns results under 1s for 95th percentile |
| NFR-02 | **Scalability** | Support 10k concurrent users by end of Phase 2; horizontally scalable backend |
| NFR-03 | **Security** | All KYC images encrypted at rest (AES-256); TLS 1.3 in transit; KYC files auto-purge from primary DB after verification (move to cold archive) |
| NFR-04 | **Compliance — PDPA** | Consent checkbox before any personal data collection; data retention policy; user-initiated data export and deletion |
| NFR-05 | **Compliance — Computer Crime Act** | Log IP + timestamp of every login, retained ≥90 days |
| NFR-06 | **Compliance — ETDA** | Register as Digital Platform within 90 days of launch |
| NFR-07 | **Compliance — DBD** | E-commerce registration mark displayed on footer |
| NFR-08 | **Availability** | 99.5% uptime in Phase 1, 99.9% in Phase 2 |
| NFR-09 | **Accessibility** | WCAG 2.1 AA for public pages; Thai language primary, English secondary |
| NFR-10 | **Mobile** | Mobile-first responsive design; PWA installable; works on Android 8+ and iOS 14+ |
| NFR-11 | **Localization** | All copy in Thai with proper formatting (Buddhist calendar option); THB currency only in Phase 1–2 |

---

## 6. Risks, Assumptions & Constraints

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Tutor-student bypass to LINE | High | High | Chat regex filter + reward asymmetry (rating loss, badge revocation) |
| R-02 | Platform classified as "tutoring school" under MoE law | Medium | High | Brand exclusively as "Matching Platform / Technology Company"; never use words "โรงเรียนกวดวิชา" / "สถาบัน" |
| R-03 | BoT classifies platform as money custodian (escrow) | Medium | High | Phase 2 onward, push escrow responsibility to Stripe Connect / Opn Payments |
| R-04 | Fake KYC documents | Medium | Medium | Manual admin review in Phase 1; ID verification API in Phase 2 |
| R-05 | Copyright violations in uploaded sheets | Medium | Medium | Notice & Takedown system; T&C indemnification clause |
| R-06 | Low tutor supply at launch | High | High | Recruit 30–50 tutors manually before public launch (cold outreach to top universities) |
| R-07 | PDPA breach (KYC leak) | Low | Critical | Encryption at rest, access logs, vendor SOC 2 compliance |

### Assumptions

- Thai language is primary; no internationalization in Phase 1–2.
- Students/parents have access to PromptPay (universal in Thailand).
- Tutors are willing to undergo KYC for a verified badge.
- 15–20% commission is acceptable to tutors given marketing value.
- Phase 1 admin team can handle manual slip verification and payout processing for ~500 transactions/month.

### Constraints

- Must operate under Thai law (PDPA, Computer Crime Act, ETDA, DBD, BoT, SCB).
- Cannot self-custody escrow funds long-term without BoT license.
- Annual revenue >1.8M THB triggers mandatory VAT registration.

---

## 7. Phased Roadmap

### Phase 0 — Foundation (Pre-Build, ~2 weeks)

- Register juristic person (company, never personal account)
- Lock down brand positioning as "Matching Platform — Technology Company" (NOT tutoring school)
- Draft T&C, Privacy Policy, Refund Policy, Copyright Policy
- Trademark "Pee Rahat" name and logo

### Phase 1 — MVP (~3–4 months)

**Goal: Lean launch, prove students will pay.**

- Tutor Hub: diagnostic quiz, KYC upload, profile, search, chat, manual booking, verified review
- Sheet Marketplace: upload, buy, download (no auto-watermark yet)
- TCAS Calc: score input + What-If algorithm + upsell CTA
- Community: web board with university badges
- **Manual payment flow**: PromptPay → slip upload → SlipOK API → admin approval → manual payout 2x/month
- DBD e-commerce registration
- Compliance features: log retention, report buttons, secure DB for KYC

### Phase 2 — Scaling & Automation (~Months 5–10)

- Automated payment via Stripe Connect or Opn Payments (auto-split, escrow, tutor payout)
- ETDA Digital Platform registration
- SCB direct-marketing registration
- VAT registration trigger preparation; e-Tax Invoice integration
- Calendar sync, in-app video classroom with recording, watermarked PDF delivery
- TCAS Plan B suggestions, deadline tracker
- Tagged community questions, sub-rooms
- Tiered commission system, referral bonus, Study-to-Earn points

### Phase 3 — Growth (~Month 10+)

- Mobile native apps (iOS / Android) if PWA usage data justifies
- Featured listings (paid promotion for tutors)
- Bounty marketplace, bundle pricing
- Plug into school partnerships, scholarship programs
- B2B (sell to schools as a managed tutoring service)

---

## 8. UX / UI Principles

- **Mobile-first.** Most students browse on phones during commutes.
- **Trust-forward.** Verified badges, escrow icon, refund policy must be visible on every booking step.
- **Reference UX:** uniclass.co.th (clean, modern Thai EdTech) and witx.in.th (closest competitor).
- **Manual-Accept booking flow** to reduce no-shows: student requests → tutor accepts within 24h → payment → confirmed.
- **Two-sided dashboards:** distinct UIs for student vs tutor with role-based navigation.
- **Onboarding:** diagnostic quiz as first-run experience for students; KYC wizard for tutors.

---

## 9. Sample User Stories with Acceptance Criteria

### Epic: Tutor Verification

**US-01:** As a tutor, I want to upload my National ID and Transcript so that I can earn the Verified Badge and appear in search results.

- **Given** I am a registered tutor on the KYC page, **when** I upload a valid National ID image, a selfie holding the ID, and a Transcript PDF and submit, **then** my application enters "Pending Review" status within 5 seconds.
- **Given** my application is "Pending Review", **when** the admin approves it, **then** I receive an in-app and email notification within 1 minute and the Verified Badge appears on my profile.
- **Given** my application is rejected, **when** I receive the rejection notification, **then** the reason is shown and I can re-upload corrected documents.
- **Given** my KYC documents are stored, **when** verification completes, **then** the originals are moved to encrypted cold storage within 24 hours and removed from the primary database.

### Epic: Escrow Payment (Phase 1 Manual)

**US-02:** As a student, I want to pay for a tutoring session via PromptPay slip so that my money is held safely until the class is delivered.

- **Given** I have confirmed a booking with a tutor, **when** I scan the PromptPay QR and upload my transfer slip, **then** SlipOK API verifies the slip within 10 seconds.
- **Given** the slip is verified valid, **when** verification completes, **then** my booking is marked "Paid (Held in Escrow)" and the tutor is notified.
- **Given** the slip is invalid or duplicated, **when** SlipOK returns an error, **then** I see a clear error message and am prompted to re-upload or contact support.
- **Given** the class is completed and 24 hours have passed without a Report-Issue, **when** the timer expires, **then** the funds enter the next payout batch for the tutor (minus commission and 3% withholding tax).

### Epic: TCAS What-If Calculator

**US-03:** As a student, I want to enter my current scores and target faculty so that I can see exactly which subjects I need to improve and book a tutor immediately.

- **Given** I am on the TCAS Calc page, **when** I enter my TGAT, TPAT, A-Level scores and select "Engineering, Khon Kaen University" as my target, **then** the result panel renders within 2 seconds showing per-subject score gap.
- **Given** the result shows I need TGAT +5 points and Math A-Level +8 points, **when** the gap is non-zero, **then** a "Find Tutor for [Subject]" button appears beside each gap.
- **Given** I click "Find Tutor for Math", **when** the page loads, **then** I am taken to a pre-filtered tutor list for Math A-Level sorted by rating.
- **Given** my scores already meet the target, **when** the calculation runs, **then** I see a "You're on track 🎉" message instead of upsell CTAs.

> **BA Note:** US-03 might be too large — split into "Score Input + Calculation" and "Upsell Routing" if needed.

---

## 10. Tech Stack Recommendation

### Selection Principles

1. **Pragmatic over trendy** — favor mature, well-documented stacks with strong Thai developer community.
2. **Single language across stack** when possible to simplify hiring.
3. **Managed services for non-core** (auth, payments, file storage, email) to keep team small.
4. **Mobile-first PWA** before native to control burn rate.

### Recommended Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend (Web)** | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui | SSR for SEO (critical for tutor profile pages), excellent Thai font handling, large dev pool, PWA-friendly |
| **Mobile** | PWA in Phase 1; React Native (Expo) in Phase 3 | Reuse most logic from Next.js; defer native cost until proven |
| **Backend API** | Node.js + NestJS (TypeScript) — OR — Next.js API Routes for MVP | Same language as frontend; NestJS gives modular structure for scaling |
| **Database** | PostgreSQL (managed: Supabase or AWS RDS) | Relational integrity for bookings, payments, KYC; Postgres full-text search adequate for Phase 1 tutor search |
| **Cache & Queue** | Redis (Upstash for managed) | Session, rate-limit, payout job queue |
| **Search** | Postgres full-text in Phase 1; Meilisearch or Typesense in Phase 2 | Avoid Elasticsearch ops cost early |
| **File Storage** | Cloudflare R2 or AWS S3 with KMS encryption | Cheap egress (R2), separate bucket for KYC with private ACL |
| **Auth** | Clerk or Supabase Auth | Email + LINE Login + Google; saves weeks of dev time |
| **Payments — Phase 1** | Manual + SlipOK API | No PCI scope, fastest to ship |
| **Payments — Phase 2** | Opn Payments (preferred for Thailand) or Stripe Connect | PromptPay native, marketplace split-payout |
| **Realtime Chat** | Supabase Realtime, or Pusher, or Ably | Hosted; avoids running your own WebSocket cluster |
| **Video Classroom (Phase 2)** | LiveKit (self-host or cloud) or Daily.co | Recording built-in, lower latency in APAC than Zoom SDK |
| **Email & Notifications** | Resend (transactional) + OneSignal (push) | Resend has strong Next.js integration; OneSignal supports web push + future native |
| **Analytics** | PostHog (self-hosted or cloud) + Google Analytics 4 | PostHog gives funnels and session replay critical for finding bypass attempts |
| **Logging & Monitoring** | Sentry (errors) + Better Stack or Grafana Cloud (logs/metrics) | Compliance-friendly log retention for Computer Crime Act |
| **Infra & Deploy** | Vercel (frontend) + Railway / Fly.io (backend) in Phase 1; AWS or GCP in Phase 2 | Fastest deploy, autoscale, predictable cost |
| **CI/CD** | GitHub Actions | Free tier sufficient for small team |
| **PDF Watermarking (Phase 2)** | pdf-lib (Node) or Python pikepdf in worker queue | Run async on download |
| **OCR for KYC (Phase 2)** | Aws Textract or Google Document AI, or Iapp.co.th (Thai-native OCR) | Iapp better for Thai ID cards |

### Architecture Notes

- **Repository:** Monorepo (Turborepo or pnpm workspaces) — `apps/web`, `apps/api`, `packages/ui`, `packages/db`.
- **Database access:** Prisma ORM (type-safe queries, migration tool).
- **Background jobs:** BullMQ on Redis for payout batches, slip-verification retries, watermark generation.
- **Secrets:** Doppler or AWS Secrets Manager.
- **PDPA-sensitive data:** KYC bucket access via signed URLs only, audit-logged; tutor ID data segregated from main user table.

### Estimated Team for MVP

- 1 Tech Lead / Full-stack
- 2 Full-stack engineers
- 1 Designer (UX/UI, part-time OK)
- 1 BA / Product owner (you)
- 1 Admin / Ops (manual KYC + slip approval)
- Optional: 1 Marketing / Community manager from Day 1

---

## 11. Out of Scope (Phase 1)

To keep MVP lean, the following are explicitly **not** included:

- Native iOS / Android apps (PWA only)
- In-app video calling (use Google Meet externally)
- Auto-watermarked PDFs (manual delivery)
- Tiered commission system (flat 20% in Phase 1)
- Plan B faculty suggestions (only direct What-If)
- Tagged community questions and sub-rooms
- Bundle pricing, bounty system
- AI-powered tutor matching beyond diagnostic quiz logic

---

## 12. Open Questions for Stakeholder Review

1. What is the launch target date and budget ceiling for Phase 1?
2. Has a juristic person already been registered? (Phase 0 blocker)
3. Will there be a paid acquisition budget at launch (FB / TikTok ads)?
4. Are there partner universities or schools committed for pilot?
5. Who is the legal counsel handling ETDA/SCB/PDPA registrations?
6. What is the dispute-resolution SLA (admin response time target)?
7. Any data residency constraint requiring Thai-region cloud hosting?

---

*End of document. This file is intended as a living artifact — update as decisions are made and assumptions are validated.*
