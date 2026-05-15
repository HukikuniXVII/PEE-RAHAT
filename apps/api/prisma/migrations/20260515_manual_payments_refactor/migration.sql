-- Manual-only payment refactor (2026-05-15).
-- Auto-payment gateway integration is removed from the roadmap; the
-- platform stays on PromptPay + ZercleSlip + admin-confirmed payouts.
--
-- Changes:
--  1. PaymentStatus: rename 'released' → 'released_for_payout', add 'paid_out',
--     add PayoutStatus enum. 'verified' is left in place because Postgres
--     cannot drop enum values without recreating the type.
--  2. PaymentIntent: rename slipOkRef → transactionId (with @unique for
--     duplicate-slip dedupe), add zercleResponse / zercleVerifiedAt /
--     verifiedAmountThb / originalAmountThb / slipUploadedAt.
--  3. Payout: add status, transferredAt, transferredBy, transferSlipKey,
--     notes. paidAt is kept for one release cycle of overlap.

-- 1. Enum changes. ADD VALUE must run in its own transaction, which Prisma
-- handles by executing each statement separately.
ALTER TYPE "PaymentStatus" RENAME VALUE 'released' TO 'released_for_payout';
ALTER TYPE "PaymentStatus" ADD VALUE 'paid_out';

CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- 2. PaymentIntent — rename slipOkRef → transactionId, add audit fields.
ALTER TABLE "PaymentIntent"
  RENAME COLUMN "slipOkRef" TO "transactionId";

ALTER TABLE "PaymentIntent"
  ADD COLUMN "originalAmountThb" INTEGER,
  ADD COLUMN "slipUploadedAt"    TIMESTAMP(3),
  ADD COLUMN "zercleResponse"    JSONB,
  ADD COLUMN "zercleVerifiedAt"  TIMESTAMP(3),
  ADD COLUMN "verifiedAmountThb" INTEGER;

-- Clear dev-stub-ref values so the new uniqueness constraint doesn't fail
-- on seeded data. Real ZercleSlip transactionIds are unique by construction.
UPDATE "PaymentIntent"
SET    "transactionId" = NULL
WHERE  "transactionId" = 'dev-stub-ref';

CREATE UNIQUE INDEX "PaymentIntent_transactionId_key"
  ON "PaymentIntent"("transactionId");

-- 3. Payout — add manual-transfer tracking.
ALTER TABLE "Payout"
  ADD COLUMN "status"          "PayoutStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "transferredAt"   TIMESTAMP(3),
  ADD COLUMN "transferredBy"   TEXT,
  ADD COLUMN "transferSlipKey" TEXT,
  ADD COLUMN "notes"           TEXT;

-- Backfill: existing payouts with paidAt set are 'completed'; the rest
-- remain 'pending'. transferredAt mirrors paidAt for consistency.
UPDATE "Payout"
SET    "status" = 'completed',
       "transferredAt" = "paidAt"
WHERE  "paidAt" IS NOT NULL;
