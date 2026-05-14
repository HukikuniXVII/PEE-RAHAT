-- FR-TH-10..14: Postpone-class negotiation flow with refund-split policy.
-- Adds: PostponeRequest + RefundLedger tables, postpone-related enums,
-- TutorProfile.defectCount for search deprioritization, ChatThread.closedAt
-- for terminal-state UI, ChatMessage.kind to mark system messages, and the
-- new BookingStatus + PaymentStatus values that drive the resolution paths.

-- ── New enums ────────────────────────────────────────────────────────────
CREATE TYPE "ChatMessageKind" AS ENUM ('user', 'system');

CREATE TYPE "PostponeInitiator" AS ENUM ('student', 'tutor');

CREATE TYPE "PostponeStatus" AS ENUM ('negotiating', 'agreed', 'expired');

CREATE TYPE "PostponeOutcome" AS ENUM (
  'agreed',
  'no_agreement',
  'unresponsive',
  'tutor_initiated_no_agreement'
);

CREATE TYPE "RefundReason" AS ENUM (
  'postpone_short_notice_no_agreement',
  'postpone_unresponsive',
  'postpone_tutor_initiated_no_agreement'
);

-- ── Extend existing enums ────────────────────────────────────────────────
-- Booking gains pending/resolved/cancellation variants for the negotiation.
ALTER TYPE "BookingStatus" ADD VALUE 'postpone_pending';
ALTER TYPE "BookingStatus" ADD VALUE 'postponed';
ALTER TYPE "BookingStatus" ADD VALUE 'cancelled_no_agreement';
ALTER TYPE "BookingStatus" ADD VALUE 'cancelled_tutor_unresponsive';
ALTER TYPE "BookingStatus" ADD VALUE 'cancelled_tutor_initiated';

-- PaymentIntent needs a partial state for the 50/10/40 short-notice path
-- where the escrow is split (refund + tutor portion + platform fee).
ALTER TYPE "PaymentStatus" ADD VALUE 'partially_refunded';

-- ── PostponeRequest ──────────────────────────────────────────────────────
CREATE TABLE "PostponeRequest" (
  "id"               TEXT NOT NULL,
  "initiatorId"      TEXT NOT NULL,
  "initiatorRole"    "PostponeInitiator" NOT NULL,
  "reason"           TEXT NOT NULL,
  "chatExpiresAt"    TIMESTAMP(3) NOT NULL,
  "status"           "PostponeStatus" NOT NULL DEFAULT 'negotiating',
  "proposedAt"       TIMESTAMP(3),
  "proposedDuration" INTEGER,
  "resolvedAt"       TIMESTAMP(3),
  "resolvedAs"       "PostponeOutcome",
  "wasShortNotice"   BOOLEAN NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostponeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostponeRequest_status_chatExpiresAt_idx"
  ON "PostponeRequest"("status", "chatExpiresAt");

ALTER TABLE "PostponeRequest"
  ADD CONSTRAINT "PostponeRequest_initiatorId_fkey"
  FOREIGN KEY ("initiatorId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Booking.postponeRequestId ────────────────────────────────────────────
ALTER TABLE "Booking" ADD COLUMN "postponeRequestId" TEXT;

CREATE UNIQUE INDEX "Booking_postponeRequestId_key"
  ON "Booking"("postponeRequestId");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_postponeRequestId_fkey"
  FOREIGN KEY ("postponeRequestId") REFERENCES "PostponeRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── TutorProfile.defectCount ─────────────────────────────────────────────
-- Used as a final tiebreaker in TutorsService.search so tutors with
-- defectCount >= 3 sink to the bottom of their bucket (FR-TH-14).
ALTER TABLE "TutorProfile"
  ADD COLUMN "defectCount" INTEGER NOT NULL DEFAULT 0;

-- ── ChatThread.closedAt ──────────────────────────────────────────────────
-- Set when a postpone negotiation terminates (agreed, cancelled, expired).
-- Composer is hidden in the UI when closedAt is set.
ALTER TABLE "ChatThread" ADD COLUMN "closedAt" TIMESTAMP(3);

-- ── ChatMessage.kind ─────────────────────────────────────────────────────
-- Lets ChatService.postSystemMessage emit non-user resolution messages
-- (open, propose, confirm, cancel, timeout) that the client renders
-- with a distinct style and skips the anti-bypass filter for.
ALTER TABLE "ChatMessage"
  ADD COLUMN "kind" "ChatMessageKind" NOT NULL DEFAULT 'user';

-- ── RefundLedger ─────────────────────────────────────────────────────────
-- Records every split applied to a PaymentIntent. PaymentIntent.amountThb
-- is reduced in place to the tutor's portion so the existing payout batch
-- picks up the right amount unchanged; this table holds the audit trail.
CREATE TABLE "RefundLedger" (
  "id"                TEXT NOT NULL,
  "paymentIntentId"   TEXT NOT NULL,
  "bookingId"         TEXT NOT NULL,
  "originalAmountThb" INTEGER NOT NULL,
  "studentRefundThb"  INTEGER NOT NULL,
  "tutorThb"          INTEGER NOT NULL,
  "platformThb"       INTEGER NOT NULL,
  "reasonCode"        "RefundReason" NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefundLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefundLedger_bookingId_idx" ON "RefundLedger"("bookingId");
CREATE INDEX "RefundLedger_paymentIntentId_idx" ON "RefundLedger"("paymentIntentId");

ALTER TABLE "RefundLedger"
  ADD CONSTRAINT "RefundLedger_paymentIntentId_fkey"
  FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefundLedger"
  ADD CONSTRAINT "RefundLedger_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
