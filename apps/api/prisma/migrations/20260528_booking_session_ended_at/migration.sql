-- FR-TH (review-unlock): tutor "ปิดคลาส" button sets this once the
-- scheduled session has ended. Lets the student review form unlock
-- immediately, instead of waiting for the daily release-for-payout
-- cron to flip booking.status → completed. Escrow timing (FR-PM-05) is
-- unchanged; the 24h dispute window still owns payout release.

ALTER TABLE "Booking" ADD COLUMN "sessionEndedAt" TIMESTAMP(3);
