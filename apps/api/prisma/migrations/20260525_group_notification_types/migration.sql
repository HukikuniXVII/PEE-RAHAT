-- ─────────────────────────────────────────────────────────────────────────
-- FR-TH-18: notification types for the group-session lifecycle.
--
-- Emitted by GroupSessionService + the cron failure jobs (step 10):
--   group_invite_responded — host sees accept/decline events
--   group_ready_for_review — tutor sees forming → tutor_review transition
--   group_decision         — host sees tutor approve/reject
--   group_status_changed   — host + invitees see confirmed/failed
--
-- All four are added in this single migration so we don't fragment the
-- enum across multiple files. Used as-needed by steps 5/6/7/8/10.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TYPE "NotificationType" ADD VALUE 'group_invite_responded';
ALTER TYPE "NotificationType" ADD VALUE 'group_ready_for_review';
ALTER TYPE "NotificationType" ADD VALUE 'group_decision';
ALTER TYPE "NotificationType" ADD VALUE 'group_status_changed';
