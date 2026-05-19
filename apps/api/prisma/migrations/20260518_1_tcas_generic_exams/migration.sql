-- FR-TC-02: replace TcasProgram weights JSON with generic components + add stats + audit.
-- No production TCAS data; we drop the 3 seed rows and let seed.ts repopulate
-- with the new ProgramComponents shape (decided 2026-05-18, per drop-and-reseed call).

-- 1. Enum for typed rounds.
CREATE TYPE "TcasRoundKey" AS ENUM (
  'r1_portfolio',
  'r2_quota_kku_netsat',
  'r3_admission',
  'r4_direct'
);

-- 2. Drop the old TcasProgram (no FKs pointing in).
DROP TABLE "TcasProgram";

-- 3. Recreate TcasProgram with the new shape.
CREATE TABLE "TcasProgram" (
  "id"            TEXT NOT NULL,
  "university"    TEXT NOT NULL,
  "campus"        TEXT,
  "faculty"       TEXT NOT NULL,
  "major"         TEXT NOT NULL,
  "subTrack"      TEXT,
  "courseCode"    TEXT,
  "programType"   TEXT,
  "round"         "TcasRoundKey" NOT NULL,
  "admissionYear" INTEGER NOT NULL,
  "quotaSeats"    INTEGER NOT NULL DEFAULT 0,
  "components"    JSONB NOT NULL,
  "totalMinScore" DOUBLE PRECISION,
  "tags"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourceUrl"     TEXT,
  "sourceFile"    TEXT,
  "importedAt"    TIMESTAMP(3),
  "importedBy"    TEXT,
  CONSTRAINT "TcasProgram_pkey" PRIMARY KEY ("id")
);

-- The composite identity is nullable-tolerant — Postgres treats NULLs as distinct,
-- which is what we want (a row without a subTrack can coexist with one that has it).
CREATE UNIQUE INDEX "TcasProgram_identity_key"
  ON "TcasProgram" ("university", "major", "subTrack", "programType", "round", "admissionYear");
CREATE INDEX "TcasProgram_round_admissionYear_idx"
  ON "TcasProgram" ("round", "admissionYear");
CREATE INDEX "TcasProgram_courseCode_idx"
  ON "TcasProgram" ("courseCode");

-- 4. Past-stats table.
CREATE TABLE "TcasProgramStat" (
  "id"           TEXT NOT NULL,
  "programId"    TEXT,
  "courseCode"   TEXT NOT NULL,
  "university"   TEXT NOT NULL,
  "faculty"      TEXT NOT NULL,
  "major"        TEXT NOT NULL,
  "year"         INTEGER NOT NULL,
  "round"        "TcasRoundKey" NOT NULL,
  "quotaSeats"   INTEGER NOT NULL,
  "applicants"   INTEGER NOT NULL,
  "passedRound1" INTEGER NOT NULL DEFAULT 0,
  "passedRound2" INTEGER NOT NULL DEFAULT 0,
  "maxScoreR1"   DOUBLE PRECISION,
  "minScoreR1"   DOUBLE PRECISION,
  "maxScoreR2"   DOUBLE PRECISION,
  "minScoreR2"   DOUBLE PRECISION,
  "sourceFile"   TEXT,
  "importedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TcasProgramStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TcasProgramStat_courseCode_year_round_key"
  ON "TcasProgramStat" ("courseCode", "year", "round");
CREATE INDEX "TcasProgramStat_year_round_idx"
  ON "TcasProgramStat" ("year", "round");
CREATE INDEX "TcasProgramStat_programId_idx"
  ON "TcasProgramStat" ("programId");

ALTER TABLE "TcasProgramStat"
  ADD CONSTRAINT "TcasProgramStat_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "TcasProgram"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Audit log for admin imports.
CREATE TABLE "TcasImportAudit" (
  "id"         TEXT NOT NULL,
  "kind"       TEXT NOT NULL,
  "filename"   TEXT NOT NULL,
  "fileHash"   TEXT,
  "inserted"   INTEGER NOT NULL DEFAULT 0,
  "updated"    INTEGER NOT NULL DEFAULT 0,
  "skipped"    INTEGER NOT NULL DEFAULT 0,
  "importedBy" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TcasImportAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TcasImportAudit_importedAt_idx"
  ON "TcasImportAudit" ("importedAt");
