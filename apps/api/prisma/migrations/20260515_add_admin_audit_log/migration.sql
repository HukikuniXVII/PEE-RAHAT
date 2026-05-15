-- PDPA / NFR-05 / Computer Crime Act: admin-side audit trail for
-- sensitive surfaces (passbook view, bank reveal, payout transfer, etc.).
-- Distinct from LoginAuditLog so the action / target columns can be
-- queried directly without parsing userAgent strings.

CREATE TABLE "AdminAuditLog" (
  "id"         TEXT NOT NULL,
  "adminId"    TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId"   TEXT NOT NULL,
  "ip"         TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminId_createdAt_idx"
  ON "AdminAuditLog" ("adminId", "createdAt");

CREATE INDEX "AdminAuditLog_targetType_targetId_idx"
  ON "AdminAuditLog" ("targetType", "targetId");

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
