-- Widen passedRound1 / passedRound2 from INTEGER to DOUBLE PRECISION. CUPT's
-- TCAS67 row 2899 ships "41.1709" in ผ่าน(รอบ2) (a column-shift on their
-- side, but we want to accept what they publish), and there's no rule
-- preventing CUPT from publishing fractional pass counts in future exports.

ALTER TABLE "TcasProgramStat"
  ALTER COLUMN "passedRound1" TYPE DOUBLE PRECISION USING "passedRound1"::double precision,
  ALTER COLUMN "passedRound2" TYPE DOUBLE PRECISION USING "passedRound2"::double precision;
