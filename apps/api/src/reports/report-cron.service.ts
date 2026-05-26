import { Injectable, Logger } from "@nestjs/common";

import { readPositiveInt } from "../common/env";
import { StorageService } from "../common/storage.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Pending reports older than this are auto-rejected by the stale cron. */
const STALE_REPORT_DAYS = 90;
/** The SLA cron runs every 30m; the window is a touch wider so a deadline
 *  crossing is picked up exactly once. */
const SLA_WINDOW_MS = 35 * 60 * 1000;

/**
 * Recurring report-system maintenance (FR-CM-05). Driven by JobsService:
 * - slaCheck        every 30m — ping / escalate just-overdue reports
 * - staleCleanup    daily     — auto-reject reports left pending > 90 days
 * - evidenceCleanup daily     — PDPA purge of evidence past retention
 */
@Injectable()
export class ReportCronService {
  private readonly logger = new Logger(ReportCronService.name);
  private readonly evidenceRetentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly storage: StorageService,
  ) {
    this.evidenceRetentionDays = readPositiveInt(
      "REPORT_EVIDENCE_RETENTION_DAYS",
      90,
    );
  }

  /**
   * Ping the assignee of a just-overdue report; for an unassigned one,
   * escalate priority to urgent and alert every admin.
   */
  async slaCheck(): Promise<{ pinged: number; escalated: number }> {
    const now = Date.now();
    const justOverdue = await this.prisma.report.findMany({
      where: {
        status: { in: ["pending", "under_review"] },
        slaDeadline: { lt: new Date(now), gte: new Date(now - SLA_WINDOW_MS) },
      },
    });

    let pinged = 0;
    let escalated = 0;
    let admins: { id: string }[] | null = null;

    for (const report of justOverdue) {
      if (report.assignedToId) {
        await this.notifications.notify({
          userId: report.assignedToId,
          type: "report_sla_overdue",
          title: "รายงานเกินกำหนด",
          body: `รายงาน ${report.id} เกินกำหนด SLA แล้ว — กรุณาตรวจสอบ`,
          sourceType: "report",
          sourceId: report.id,
        });
        pinged++;
        continue;
      }
      // Unassigned — escalate and alert the admin "general channel".
      if (report.priority !== "urgent") {
        await this.prisma.report.update({
          where: { id: report.id },
          data: { priority: "urgent" },
        });
      }
      if (!admins) {
        admins = await this.prisma.user.findMany({
          where: { role: "admin" },
          select: { id: true },
        });
      }
      for (const admin of admins) {
        await this.notifications.notify({
          userId: admin.id,
          type: "report_sla_overdue",
          title: "รายงานเกินกำหนด (ยังไม่มีผู้ดูแล)",
          body: `รายงาน ${report.id} เกินกำหนด SLA และยังไม่มีผู้รับผิดชอบ — ยกระดับเป็นเร่งด่วนแล้ว`,
          sourceType: "report",
          sourceId: report.id,
        });
      }
      escalated++;
    }
    return { pinged, escalated };
  }

  /** Auto-reject reports left pending past the stale window. */
  async staleCleanup(): Promise<{ rejected: number }> {
    const cutoff = new Date(Date.now() - STALE_REPORT_DAYS * DAY_MS);
    const result = await this.prisma.report.updateMany({
      where: { status: "pending", createdAt: { lt: cutoff } },
      data: {
        status: "rejected",
        resolvedAt: new Date(),
        resolutionNote: "เกินกำหนดการตอบกลับ",
      },
    });
    return { rejected: result.count };
  }

  /**
   * PDPA: purge evidence files for reports resolved longer ago than the
   * retention window, then clear the keys so each report is purged once.
   */
  async evidenceCleanup(): Promise<{ purged: number }> {
    const cutoff = new Date(
      Date.now() - this.evidenceRetentionDays * DAY_MS,
    );
    const reports = await this.prisma.report.findMany({
      where: {
        resolvedAt: { lt: cutoff },
        OR: [
          { evidenceKeys: { isEmpty: false } },
          { events: { some: { evidenceKeys: { isEmpty: false } } } },
        ],
      },
      include: { events: { select: { id: true, evidenceKeys: true } } },
    });

    let purged = 0;
    for (const report of reports) {
      const keys = [
        ...report.evidenceKeys,
        ...report.events.flatMap((e) => e.evidenceKeys),
      ];
      for (const key of keys) {
        await this.storage.deleteObject(key);
        purged++;
      }
      await this.prisma.$transaction([
        this.prisma.report.update({
          where: { id: report.id },
          data: { evidenceKeys: [] },
        }),
        this.prisma.reportEvent.updateMany({
          where: { reportId: report.id },
          data: { evidenceKeys: [] },
        }),
      ]);
    }
    if (purged > 0) {
      this.logger.log(`Purged ${purged} report evidence file(s)`);
    }
    return { purged };
  }
}
