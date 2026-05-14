-- FR-TH-16: tutors can mark recurring weekly windows as unavailable for
-- teaching (lunch break, regular commitment, etc.). Expanded into concrete
-- intervals by /tutors/:id/availability and used by BookingsService.
-- assertNoOverlap so create / propose / confirm reject conflicting slots.

CREATE TABLE "TutorUnavailability" (
  "id"          TEXT NOT NULL,
  "tutorId"     TEXT NOT NULL,
  "weekday"     INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute"   INTEGER NOT NULL,
  "reason"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TutorUnavailability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TutorUnavailability_tutorId_idx" ON "TutorUnavailability"("tutorId");

ALTER TABLE "TutorUnavailability"
  ADD CONSTRAINT "TutorUnavailability_tutorId_fkey"
  FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
