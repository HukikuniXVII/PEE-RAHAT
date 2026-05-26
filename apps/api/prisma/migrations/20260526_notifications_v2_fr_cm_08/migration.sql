-- ─────────────────────────────────────────────────────────────────────────
-- FR-CM-08 — real-time notifications, schema groundwork.
--
-- Additive + backfill, NOT destructive. Existing notify() callers and
-- their rows keep working untouched; the report system's reportId
-- column gets folded into the new (sourceType, sourceId) pair, and
-- linkUrl renamed to actionUrl. Both renames done as add-column +
-- backfill + drop-column so any in-flight queries don't see a hole.
--
-- New surfaces (all inert until Phase 2):
--   - NotificationCategory enum, plus a category column on every row
--   - sourceType / sourceId polymorphic pointer (replaces reportId)
--   - iconKind for the panel UI
--   - NotificationPreference (pushEnabled + typeOverrides + quietHours)
--   - 24 new canonical NotificationType values
--
-- Phase 2 will add the SSE gateway / REST endpoints / bell UI. Phase 3
-- (separate PR) adds the PushSubscription model + web-push delivery.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. New NotificationCategory enum.
CREATE TYPE "NotificationCategory" AS ENUM (
    'bookings',
    'payments',
    'chat',
    'reports',
    'reviews',
    'account',
    'system'
);

-- 2. Extend NotificationType with the 24 canonical FR-CM-08 values. The
--    pre-existing report_* / group_* names stay so legacy callers don't
--    break. Postgres requires ADD VALUE statements outside the rows that
--    USE them in the same migration — these are only used by service code
--    going forward, so we're safe.
ALTER TYPE "NotificationType" ADD VALUE 'booking_requested';
ALTER TYPE "NotificationType" ADD VALUE 'booking_accepted';
ALTER TYPE "NotificationType" ADD VALUE 'booking_rejected';
ALTER TYPE "NotificationType" ADD VALUE 'booking_paid';
ALTER TYPE "NotificationType" ADD VALUE 'booking_meeting_ready';
ALTER TYPE "NotificationType" ADD VALUE 'booking_starting_soon';
ALTER TYPE "NotificationType" ADD VALUE 'group_invite';
ALTER TYPE "NotificationType" ADD VALUE 'group_approval_needed';
ALTER TYPE "NotificationType" ADD VALUE 'group_confirmed';
ALTER TYPE "NotificationType" ADD VALUE 'group_failed';
ALTER TYPE "NotificationType" ADD VALUE 'payment_verified';
ALTER TYPE "NotificationType" ADD VALUE 'payment_failed';
ALTER TYPE "NotificationType" ADD VALUE 'payout_processed';
ALTER TYPE "NotificationType" ADD VALUE 'postpone_requested';
ALTER TYPE "NotificationType" ADD VALUE 'postpone_proposal';
ALTER TYPE "NotificationType" ADD VALUE 'postpone_agreed';
ALTER TYPE "NotificationType" ADD VALUE 'postpone_expired';
ALTER TYPE "NotificationType" ADD VALUE 'report_received';
ALTER TYPE "NotificationType" ADD VALUE 'review_received';
ALTER TYPE "NotificationType" ADD VALUE 'chat_new_message';
ALTER TYPE "NotificationType" ADD VALUE 'account_warning';
ALTER TYPE "NotificationType" ADD VALUE 'account_suspended';
ALTER TYPE "NotificationType" ADD VALUE 'kyc_approved';
ALTER TYPE "NotificationType" ADD VALUE 'kyc_rejected';

-- 3. Augment Notification with the new columns. category goes in as
--    nullable so we can backfill before flipping NOT NULL at the end.
ALTER TABLE "Notification"
    ADD COLUMN "category"   "NotificationCategory",
    ADD COLUMN "iconKind"   TEXT,
    ADD COLUMN "actionUrl"  TEXT,
    ADD COLUMN "sourceType" TEXT,
    ADD COLUMN "sourceId"   TEXT;

-- 4. Backfill category from type. The legacy report_* and group_*
--    values are the only ones present in existing rows; everything else
--    is unreachable code. The default ('system') is defensive — a row
--    that somehow held an unknown type still satisfies NOT NULL.
UPDATE "Notification" SET "category" = CASE
    WHEN "type"::text LIKE 'report_%'  THEN 'reports'::"NotificationCategory"
    WHEN "type"::text LIKE 'group_%'   THEN 'bookings'::"NotificationCategory"
    ELSE 'system'::"NotificationCategory"
END;
ALTER TABLE "Notification" ALTER COLUMN "category" SET NOT NULL;

-- 5. Rename: linkUrl → actionUrl. Done as backfill + drop so any
--    in-flight read between the two statements still finds the URL on
--    one of the columns.
UPDATE "Notification" SET "actionUrl" = "linkUrl" WHERE "linkUrl" IS NOT NULL;
ALTER TABLE "Notification" DROP COLUMN "linkUrl";

-- 6. Rename: reportId → (sourceType='report', sourceId=reportId).
UPDATE "Notification"
SET "sourceType" = 'report', "sourceId" = "reportId"
WHERE "reportId" IS NOT NULL;
ALTER TABLE "Notification" DROP COLUMN "reportId";

-- 7. Index swap. Spec wants a descending-createdAt index for the panel
--    feed (newest-first listings) and a (sourceType, sourceId) lookup
--    for the dedup query in notify(). Old (userId, createdAt asc) +
--    (userId, readAt) indexes go.
DROP INDEX IF EXISTS "Notification_userId_createdAt_idx";
DROP INDEX IF EXISTS "Notification_userId_readAt_idx";
CREATE INDEX "Notification_userId_createdAt_idx"
    ON "Notification" ("userId", "createdAt" DESC);
CREATE INDEX "Notification_sourceType_sourceId_idx"
    ON "Notification" ("sourceType", "sourceId");

-- 8. NotificationPreference. Push columns added now even though Phase 3
--    enforces them — adopting push later won't require another schema
--    migration that way. typeOverrides is a JSON map of
--    NotificationType → boolean; missing keys = enabled.
CREATE TABLE "NotificationPreference" (
    "userId"          TEXT     PRIMARY KEY,
    "pushEnabled"     BOOLEAN  NOT NULL DEFAULT true,
    "typeOverrides"   JSONB    NOT NULL DEFAULT '{}'::jsonb,
    "quietHoursStart" INTEGER,
    "quietHoursEnd"   INTEGER,
    "timezone"        TEXT     NOT NULL DEFAULT 'Asia/Bangkok',
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
