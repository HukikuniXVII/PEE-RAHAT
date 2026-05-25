-- ─────────────────────────────────────────────────────────────────────────
-- FR-TH-18: group session bookings.
--
-- DDL additions:
--   - SessionType / GroupStatus / ParticipantRole / ParticipantStatus enums
--   - 3 new RefundReason values for group failure modes
--   - Booking: sessionType, capacity, groupStatus, inviteCode, inviteExpiresAt
--   - ChatThread: sessionType, studentId nullable
--   - BookingParticipant: one row per seat in a booking
--   - ChatThreadParticipant: many:many junction for group chat threads
--
-- Backfill (idempotent — safe to re-run on a freshly-restored copy):
--   - one host BookingParticipant per existing Booking, mirroring booking.status
--     and pointing at the booking's existing PaymentIntent (if any)
--   - one ChatThreadParticipant per (existing thread, student) and per
--     (existing thread, tutor.user) so unread-count code can converge on a
--     single junction-table path going forward without breaking 1-on-1
--
-- The new RefundReason enum values are added but NOT used in this migration's
-- DML; Postgres 13+ allows ADD VALUE in a transaction provided the new value
-- is not also read in the same transaction.
-- ─────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('one_on_one', 'group');
CREATE TYPE "GroupStatus" AS ENUM ('forming', 'tutor_review', 'confirmed', 'failed');
CREATE TYPE "ParticipantRole" AS ENUM ('host', 'invited');
CREATE TYPE "ParticipantStatus" AS ENUM ('invited', 'accepted', 'declined', 'paid', 'expired');

-- AlterEnum — RefundReason gets 3 new failure modes
ALTER TYPE "RefundReason" ADD VALUE 'group_rejected_by_tutor';
ALTER TYPE "RefundReason" ADD VALUE 'group_invite_expired';
ALTER TYPE "RefundReason" ADD VALUE 'group_payment_incomplete';

-- ChatThread.studentId becomes nullable (group threads have null student)
ALTER TABLE "ChatThread" DROP CONSTRAINT "ChatThread_studentId_fkey";
ALTER TABLE "ChatThread" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "ChatThread" ADD COLUMN "sessionType" "SessionType" NOT NULL DEFAULT 'one_on_one';
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Booking gets the 5 group-only columns + the inviteCode unique
ALTER TABLE "Booking"
    ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "groupStatus" "GroupStatus",
    ADD COLUMN "inviteCode" TEXT,
    ADD COLUMN "inviteExpiresAt" TIMESTAMP(3),
    ADD COLUMN "sessionType" "SessionType" NOT NULL DEFAULT 'one_on_one';
CREATE UNIQUE INDEX "Booking_inviteCode_key" ON "Booking"("inviteCode");
CREATE INDEX "Booking_groupStatus_idx" ON "Booking"("groupStatus");

-- BookingParticipant — one row per seat
CREATE TABLE "BookingParticipant" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'invited',
    "paymentIntentId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "BookingParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookingParticipant_paymentIntentId_key" ON "BookingParticipant"("paymentIntentId");
CREATE INDEX "BookingParticipant_bookingId_status_idx" ON "BookingParticipant"("bookingId", "status");
CREATE INDEX "BookingParticipant_studentId_idx" ON "BookingParticipant"("studentId");
CREATE UNIQUE INDEX "BookingParticipant_bookingId_studentId_key" ON "BookingParticipant"("bookingId", "studentId");

ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_paymentIntentId_fkey"
    FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ChatThreadParticipant — many:many junction for group threads (backfilled
-- for 1-on-1 threads too so unread counts can use a single code path)
CREATE TABLE "ChatThreadParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatThreadParticipant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatThreadParticipant_userId_idx" ON "ChatThreadParticipant"("userId");
CREATE UNIQUE INDEX "ChatThreadParticipant_threadId_userId_key" ON "ChatThreadParticipant"("threadId", "userId");

ALTER TABLE "ChatThreadParticipant" ADD CONSTRAINT "ChatThreadParticipant_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatThreadParticipant" ADD CONSTRAINT "ChatThreadParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Backfill ────────────────────────────────────────────────────────────

-- One host BookingParticipant per existing Booking. Status is derived so
-- the participant row reflects what already happened to the booking:
--   - 'paid' for bookings that reached payment (paid/completed/reported/refunded)
--   - 'expired' for terminal-failure statuses (rejected/expired/cancelled*)
--   - 'accepted' for the in-progress middle (requested/accepted/postpone*)
INSERT INTO "BookingParticipant" (
    "id", "bookingId", "studentId", "role", "status",
    "paymentIntentId", "invitedAt", "acceptedAt", "paidAt"
)
SELECT
    gen_random_uuid()::text,
    b."id",
    b."studentId",
    'host'::"ParticipantRole",
    CASE
        WHEN b."status" IN ('paid','completed','reported','refunded')
            THEN 'paid'::"ParticipantStatus"
        WHEN b."status" IN ('rejected','expired','cancelled',
                            'cancelled_no_agreement',
                            'cancelled_tutor_unresponsive',
                            'cancelled_tutor_initiated')
            THEN 'expired'::"ParticipantStatus"
        ELSE 'accepted'::"ParticipantStatus"
    END,
    pi."id",
    b."createdAt",
    b."createdAt",
    pi."slipUploadedAt"
FROM "Booking" b
LEFT JOIN "PaymentIntent" pi ON pi."bookingId" = b."id"
ON CONFLICT ("bookingId", "studentId") DO NOTHING;

-- ChatThreadParticipant rows for every existing thread:
--   - student row (skipped if studentId is null, which is a freshly-created
--     group thread — shouldn't exist yet at migration time, but safe)
--   - tutor row (TutorProfile → User.id resolves the tutor's user)
INSERT INTO "ChatThreadParticipant" (
    "id", "threadId", "userId", "lastReadAt", "joinedAt"
)
SELECT
    gen_random_uuid()::text, ct."id", ct."studentId",
    ct."studentLastReadAt", ct."createdAt"
FROM "ChatThread" ct
WHERE ct."studentId" IS NOT NULL
ON CONFLICT ("threadId", "userId") DO NOTHING;

INSERT INTO "ChatThreadParticipant" (
    "id", "threadId", "userId", "lastReadAt", "joinedAt"
)
SELECT
    gen_random_uuid()::text, ct."id", tp."userId",
    ct."tutorLastReadAt", ct."createdAt"
FROM "ChatThread" ct
JOIN "TutorProfile" tp ON tp."id" = ct."tutorId"
ON CONFLICT ("threadId", "userId") DO NOTHING;
