-- FR-PM-05: admins need a terminal payment status when a class is disputed
-- so escrow funds are blocked from the next payout batch pending review.
ALTER TYPE "PaymentStatus" ADD VALUE 'disputed';
