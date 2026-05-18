-- Align TcasProgramStat with the real CUPT xlsx layouts:
--   - T68-stat-r3_1 (TCAS68 round 3, first pass): 13 cols, single "ผ่าน"
--   - TCAS67_maxmin: 16 cols, with ผ่าน(รอบ1) + ผ่าน(รอบ2) + R1/R2 score pairs
-- Adds the columns CUPT actually publishes (วิทยาเขต / สาขา-วิชาเอก / รหัสรับร่วม)
-- and makes pass-counts nullable so single-pass rows don't conflate "0 passed"
-- with "not measured this round."

ALTER TABLE "TcasProgramStat"
  ADD COLUMN "campus"    TEXT,
  ADD COLUMN "subTrack"  TEXT,
  ADD COLUMN "jointCode" TEXT;

-- Existing rows have passedRound1/2 = 0 (the old default). Leave them; new
-- imports can write NULL to indicate "no data for this pass."
ALTER TABLE "TcasProgramStat"
  ALTER COLUMN "passedRound1" DROP NOT NULL,
  ALTER COLUMN "passedRound1" DROP DEFAULT,
  ALTER COLUMN "passedRound2" DROP NOT NULL,
  ALTER COLUMN "passedRound2" DROP DEFAULT;
