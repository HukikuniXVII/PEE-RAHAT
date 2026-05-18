-- Rebuild import infrastructure for the AI-powered TCAS criteria importer.
-- TcasImportAudit comes back (we dropped it 2 migrations ago) and a new
-- AiUsageLog tracks Gemini calls for the admin dashboard's monthly tile.

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

CREATE TABLE "AiUsageLog" (
  "id"               TEXT NOT NULL,
  "adminId"          TEXT NOT NULL,
  "service"          TEXT NOT NULL,
  "model"            TEXT NOT NULL,
  "promptTokens"     INTEGER NOT NULL,
  "completionTokens" INTEGER NOT NULL,
  "estimatedCostUsd" DOUBLE PRECISION NOT NULL,
  "durationMs"       INTEGER NOT NULL,
  "fileName"         TEXT,
  "rowCount"         INTEGER,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageLog_service_createdAt_idx"
  ON "AiUsageLog" ("service", "createdAt");
CREATE INDEX "AiUsageLog_adminId_createdAt_idx"
  ON "AiUsageLog" ("adminId", "createdAt");
