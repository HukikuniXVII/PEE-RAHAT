-- FR-TH-17 rev2: rename the Meet columns to the at-payment-confirm
-- vocabulary the spec settled on. Data follows the rename — bookings
-- that already have a Meet link keep it under the new name.

ALTER TABLE "Booking"
  RENAME COLUMN "meetLink" TO "meetingUrl";

ALTER TABLE "Booking"
  RENAME COLUMN "meetGeneratedAt" TO "meetingGeneratedAt";
