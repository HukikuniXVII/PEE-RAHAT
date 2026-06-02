-- NFR-04 (PDPA): self-service account deletion.
-- Soft-delete + PII anonymization rather than a row drop, so accounting /
-- audit records (RefundLedger, Payout, completed Bookings) keep a valid FK
-- back to the now-anonymized User. `deletedAt` is checked in the auth guard
-- to reject any request from a deleted account (the Supabase JWT is
-- stateless, so there is no session table to clear).
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletionReason" TEXT;
