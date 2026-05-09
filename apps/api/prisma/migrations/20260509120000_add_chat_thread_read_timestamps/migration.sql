-- Per-side last-read timestamps on chat threads. Null means "never read",
-- which the application treats as "all messages are unread".
ALTER TABLE "ChatThread" ADD COLUMN "studentLastReadAt" TIMESTAMP(3);
ALTER TABLE "ChatThread" ADD COLUMN "tutorLastReadAt" TIMESTAMP(3);
