-- FR-TH-15: platform/admin-initiated refunds that aren't tied to a postpone
-- outcome. First user is scripts/resolve-existing-overlaps.ts, which cleans
-- up pre-FR-TH-15 overlapping bookings by canceling the later-created one
-- and refunding the student 100%. Future admin refund flows can reuse the
-- same reason code.
ALTER TYPE "RefundReason" ADD VALUE 'admin_manual';
