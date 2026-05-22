-- Report system (FR-CM-05 / FR-SM-07 / FR-PM-05): polymorphic moderation
-- reports across booking / chat / sheet / review / community-post targets,
-- a minimal in-app notification feed, per-report activity log, and the
-- moderation counters / soft-delete flags the resolution paths write.
--
-- Replaces the old lightweight Report stub (free-text reason, no SLA /
-- priority). Existing stub rows are migrated into the new schema below.

-- ── Stash existing report rows ───────────────────────────────────────────
-- targetType is cast to text so the old enum can be dropped afterwards.
CREATE TEMPORARY TABLE "_report_migration" AS
SELECT
  "id",
  "reporterId",
  "targetType"::text AS "targetType",
  "targetId",
  "details",
  "resolvedAt",
  "createdAt"
FROM "Report";

-- ── Drop the old report system ───────────────────────────────────────────
DROP TABLE "Report";
DROP TYPE "ReportTargetType";

-- ── New enums ────────────────────────────────────────────────────────────
CREATE TYPE "ReportTarget" AS ENUM (
  'booking', 'chat_message', 'sheet', 'review', 'community_post'
);

CREATE TYPE "ReportCategory" AS ENUM (
  'no_show', 'fraud', 'abuse', 'harassment', 'scam',
  'off_platform_solicitation', 'fake_credentials', 'impersonation',
  'inappropriate_content', 'pirated_content', 'quality_issue',
  'payment_issue', 'spam', 'misinformation', 'other'
);

CREATE TYPE "ReportStatus" AS ENUM (
  'pending', 'under_review', 'escalated', 'resolved', 'rejected', 'duplicate'
);

CREATE TYPE "ReportPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE "ReportResolution" AS ENUM (
  'no_action', 'warning_issued', 'suspension_temp', 'suspension_perm',
  'refund_partial', 'refund_full', 'content_removed', 'account_banned',
  'reporter_warned'
);

CREATE TYPE "ReportEventKind" AS ENUM (
  'reporter_comment', 'admin_note', 'status_change', 'assignment', 'resolution'
);

CREATE TYPE "NotificationType" AS ENUM (
  'report_filed', 'report_under_review', 'report_resolved', 'report_warning',
  'report_suspension', 'report_content_removed', 'report_reporter_warned',
  'report_sla_overdue'
);

-- ── User: moderation counters ────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "falseReportCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "warningCount"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "suspendedUntil"   TIMESTAMP(3);

-- ── Soft-delete flags for content_removed resolutions ────────────────────
ALTER TABLE "StudySheet"
  ADD COLUMN "removed"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "removedReason" TEXT,
  ADD COLUMN "removedAt"     TIMESTAMP(3);

ALTER TABLE "TutorReview"
  ADD COLUMN "removed"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "removedReason" TEXT,
  ADD COLUMN "removedAt"     TIMESTAMP(3);

ALTER TABLE "CommunityPost"
  ADD COLUMN "removed"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "removedReason" TEXT,
  ADD COLUMN "removedAt"     TIMESTAMP(3);

ALTER TABLE "CommunityReply"
  ADD COLUMN "removed"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "removedReason" TEXT,
  ADD COLUMN "removedAt"     TIMESTAMP(3);

-- ── RefundLedger.reportId ────────────────────────────────────────────────
-- Links a refund_partial / refund_full resolution back to its report.
ALTER TABLE "RefundLedger" ADD COLUMN "reportId" TEXT;

-- ── Report ───────────────────────────────────────────────────────────────
CREATE TABLE "Report" (
  "id"              TEXT NOT NULL,
  "reporterId"      TEXT NOT NULL,
  "targetType"      "ReportTarget" NOT NULL,
  "targetId"        TEXT NOT NULL,
  "targetUserId"    TEXT,
  "category"        "ReportCategory" NOT NULL,
  "description"     TEXT NOT NULL,
  "evidenceKeys"    TEXT[],
  "status"          "ReportStatus" NOT NULL DEFAULT 'pending',
  "priority"        "ReportPriority" NOT NULL DEFAULT 'normal',
  "slaDeadline"     TIMESTAMP(3) NOT NULL,
  "assignedToId"    TEXT,
  "resolvedAt"      TIMESTAMP(3),
  "resolution"      "ReportResolution",
  "resolutionNote"  TEXT,
  "publicResponse"  TEXT,
  "linkedBookingId" TEXT,
  "parentReportId"  TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_status_priority_slaDeadline_idx"
  ON "Report"("status", "priority", "slaDeadline");
CREATE INDEX "Report_targetType_targetId_idx"
  ON "Report"("targetType", "targetId");
CREATE INDEX "Report_reporterId_createdAt_idx"
  ON "Report"("reporterId", "createdAt");
CREATE INDEX "Report_targetUserId_idx" ON "Report"("targetUserId");

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── ReportEvent ──────────────────────────────────────────────────────────
CREATE TABLE "ReportEvent" (
  "id"           TEXT NOT NULL,
  "reportId"     TEXT NOT NULL,
  "kind"         "ReportEventKind" NOT NULL,
  "authorId"     TEXT,
  "text"         TEXT,
  "evidenceKeys" TEXT[],
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportEvent_reportId_createdAt_idx"
  ON "ReportEvent"("reportId", "createdAt");

ALTER TABLE "ReportEvent"
  ADD CONSTRAINT "ReportEvent_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "Report"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Notification ─────────────────────────────────────────────────────────
CREATE TABLE "Notification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "NotificationType" NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "linkUrl"   TEXT,
  "reportId"  TEXT,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx"
  ON "Notification"("userId", "readAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Backfill legacy reports ──────────────────────────────────────────────
-- The new 5-target model has no exact slot for the old `reply` / `tutor`
-- targets — those rows are bucketed as `community_post` so the reporter,
-- text, status and timestamps are preserved (the admin target panel may
-- show "not found"). category defaults to `other`; slaDeadline is
-- backfilled at createdAt + 48h (the normal-priority window).
INSERT INTO "Report" (
  "id", "reporterId", "targetType", "targetId", "category", "description",
  "evidenceKeys", "status", "priority", "slaDeadline", "resolvedAt",
  "createdAt", "updatedAt"
)
SELECT
  "id",
  "reporterId",
  (CASE "targetType"
     WHEN 'sheet'   THEN 'sheet'
     WHEN 'message' THEN 'chat_message'
     WHEN 'booking' THEN 'booking'
     ELSE 'community_post'
   END)::"ReportTarget",
  "targetId",
  'other'::"ReportCategory",
  "details",
  ARRAY[]::TEXT[],
  (CASE WHEN "resolvedAt" IS NOT NULL THEN 'resolved' ELSE 'pending' END)::"ReportStatus",
  'normal'::"ReportPriority",
  "createdAt" + INTERVAL '48 hours',
  "resolvedAt",
  "createdAt",
  COALESCE("resolvedAt", "createdAt")
FROM "_report_migration";

DROP TABLE "_report_migration";
