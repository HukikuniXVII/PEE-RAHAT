-- Bug report system (product feedback) — separate from the content-violation
-- Report system. Anonymous reports allowed (reporterId nullable).

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('minor', 'normal', 'blocker');
CREATE TYPE "BugCategory" AS ENUM ('ui', 'broken_link', 'payment', 'booking', 'chat', 'performance', 'other');
CREATE TYPE "BugStatus" AS ENUM ('open', 'in_progress', 'fixed', 'wont_fix', 'duplicate');
CREATE TYPE "BugPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "BugSeverity" NOT NULL DEFAULT 'normal',
    "category" "BugCategory" NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "viewport" TEXT NOT NULL,
    "appVersion" TEXT,
    "screenshotKeys" TEXT[],
    "consoleLog" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'open',
    "priority" "BugPriority" NOT NULL DEFAULT 'normal',
    "assignedToId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BugReport_status_priority_createdAt_idx" ON "BugReport"("status", "priority", "createdAt");
CREATE INDEX "BugReport_reporterId_idx" ON "BugReport"("reporterId");

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
