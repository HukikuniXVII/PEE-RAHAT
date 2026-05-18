-- CUPT lists sub-programs under the same courseCode but with different
-- subTrack / jointCode — e.g. courseCode 10010122904301A in TCAS68 has 10
-- rows split across 3 subTracks and 2 jointCodes. The previous 3-tuple
-- unique key (courseCode, year, round) collapsed those legitimately
-- distinct rows.

-- The 3-tuple is a plain UNIQUE INDEX (created by the initial TCAS
-- migration), not a table constraint, so use DROP INDEX rather than
-- ALTER TABLE ... DROP CONSTRAINT.
DROP INDEX "TcasProgramStat_courseCode_year_round_key";

CREATE UNIQUE INDEX "TcasProgramStat_identity_key"
  ON "TcasProgramStat" ("courseCode", "year", "round", "subTrack", "jointCode");

-- Standalone index on courseCode for the calculator's past-stats join
-- (was previously covered by the leading column of the unique index).
CREATE INDEX "TcasProgramStat_courseCode_idx"
  ON "TcasProgramStat" ("courseCode");
