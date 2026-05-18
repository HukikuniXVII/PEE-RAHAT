-- CUPT publishes "summary" rows that describe a joint admission group rather
-- than a specific program — for those, รับ/สมัคร are blank. Allow NULL so
-- the importer accepts them; admin can filter at preview time.

ALTER TABLE "TcasProgramStat"
  ALTER COLUMN "quotaSeats" DROP NOT NULL,
  ALTER COLUMN "applicants" DROP NOT NULL;
