-- FR-CM-08 Phase 3: web push subscriptions + system_test notification type.

-- Probe notification fired by the /account/notifications page's "send
-- test" button. Lives in its own type (not account_warning) so the row
-- in the user's feed reads as a test, not a real warning.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'system_test';

--
-- One row per (user, browser-issued endpoint). The endpoint is the
-- VAPID-registered push server URL and is globally unique by spec —
-- a UNIQUE on it prevents the same browser registering twice if the
-- user signs in on two accounts (the second account's POST replaces).
--
-- p256dh + auth are the curve25519 keys returned by
-- pushManager.subscribe()'s `keys` object; web-push needs both to
-- encrypt the payload. userAgent is captured at subscribe time so the
-- settings page's devices list can show "Chrome on Windows" etc.
-- lastSeenAt is bumped on every successful push so we can prune
-- subscriptions that haven't been delivered to in a long time.

CREATE TABLE "PushSubscription" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "endpoint"   TEXT NOT NULL,
  "p256dh"     TEXT NOT NULL,
  "auth"       TEXT NOT NULL,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
  ON "PushSubscription" ("endpoint");

CREATE INDEX "PushSubscription_userId_idx"
  ON "PushSubscription" ("userId");

ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
