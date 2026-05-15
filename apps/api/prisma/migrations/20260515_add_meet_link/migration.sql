-- FR-TH-17: auto-generated Google Meet link at class start.
-- Populated by the class-start BullMQ worker shortly before scheduledAt;
-- cleared on postpone-confirm so the cloned booking gets a fresh link.

ALTER TABLE "Booking"
  ADD COLUMN "meetLink"              TEXT,
  ADD COLUMN "meetGeneratedAt"       TIMESTAMP(3),
  ADD COLUMN "googleCalendarEventId" TEXT;
