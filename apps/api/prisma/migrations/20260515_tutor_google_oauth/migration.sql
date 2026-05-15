-- FR-TH-17 rev3: per-tutor Google OAuth. Each tutor connects their own
-- Gmail; the platform stores an encrypted refresh_token and mints Meet
-- links on their calendar at payment-confirm.
--
-- - TutorProfile gains the OAuth state columns. googleRefreshToken IS
--   NOT NULL is also the search-visibility gate (TutorsService.search
--   filters on this).
-- - Booking.meetingGeneratedAt was a rev2 audit column that the rev3
--   spec didn't carry forward; dropped here to match the new shape.

ALTER TABLE "TutorProfile"
  ADD COLUMN "googleRefreshToken" TEXT,
  ADD COLUMN "googleEmail"        TEXT,
  ADD COLUMN "googleConnectedAt"  TIMESTAMP(3);

ALTER TABLE "Booking"
  DROP COLUMN "meetingGeneratedAt";
