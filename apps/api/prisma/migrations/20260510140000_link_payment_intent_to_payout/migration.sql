-- FR-PM-06 idempotency: link each released PaymentIntent to the Payout
-- that consumed it so computeForPeriod can never double-pay the same
-- escrow release. ON DELETE SET NULL — manually deleting a Payout
-- releases its intents back into the eligible pool.
ALTER TABLE "PaymentIntent" ADD COLUMN "payoutId" TEXT;

ALTER TABLE "PaymentIntent"
  ADD CONSTRAINT "PaymentIntent_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "Payout"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PaymentIntent_payoutId_idx" ON "PaymentIntent"("payoutId");
