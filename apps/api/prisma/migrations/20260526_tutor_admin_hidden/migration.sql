-- FR-TH-02: admin-only "hide from /tutors search" toggle for tutor profiles.
--
-- NULL = visible (default for existing rows). Setting a timestamp removes
-- the tutor from the search list while leaving every other surface
-- (login, direct-link booking, chat, ongoing bookings) untouched.
-- Distinct from User.suspendedUntil, which blocks login + cancels in-
-- flight bookings via the report system (FR-CM-05).

ALTER TABLE "TutorProfile"
    ADD COLUMN "hiddenFromSearchAt" TIMESTAMP(3);
