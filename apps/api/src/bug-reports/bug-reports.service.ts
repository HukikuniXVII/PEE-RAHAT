import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type {
  AdminBugReportDetail,
  AdminBugReportRow,
  AdminUpdateBugReportDto,
  BugCategory,
  BugPriority,
  BugScreenshotUploadResult,
  BugSeverity,
  BugStatus,
  CreateBugReportDto,
  CreateBugReportResult,
  MyBugReport,
} from "@peerahat/types";
import { BUG_SCREENSHOT_MAX_MB } from "@peerahat/types";

import { StorageService } from "../common/storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { BugReportRateLimitService } from "./bug-report-rate-limit.service";

const SCREENSHOT_MAX_BYTES = BUG_SCREENSHOT_MAX_MB * 1024 * 1024;
const RESOLVED_STATUSES: BugStatus[] = ["fixed", "wont_fix", "duplicate"];
// Retention: purge screenshots 90 days after a report resolves, and hard-cap
// at 180 days from creation regardless of status.
const RESOLVED_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const HARD_CAP_MS = 180 * 24 * 60 * 60 * 1000;

@Injectable()
export class BugReportsService {
  private readonly logger = new Logger(BugReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly rateLimit: BugReportRateLimitService,
  ) {}

  /**
   * Auto-priority on insert: a blocker is always urgent; payment/booking
   * bugs are at least high; everything else is normal.
   */
  private computePriority(
    severity: BugSeverity,
    category: BugCategory,
  ): BugPriority {
    if (severity === "blocker") return "urgent";
    if (category === "payment" || category === "booking") return "high";
    return "normal";
  }

  /** Resolve a Supabase principal to the local User.id, or null if absent
   *  (anonymous) / not yet materialized. */
  private async resolveReporterId(
    supabaseId: string | undefined,
  ): Promise<string | null> {
    if (!supabaseId) return null;
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  /** Server-side screenshot upload (≤3 enforced client-side; this caps size
   *  + MIME). Returns the stored object key. */
  async uploadScreenshot(
    file?: Express.Multer.File,
  ): Promise<BugScreenshotUploadResult> {
    if (!file) throw new BadRequestException("ไม่พบไฟล์ที่อัปโหลด");
    if (!file.mimetype?.startsWith("image/")) {
      throw new BadRequestException("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
    }
    if (file.size > SCREENSHOT_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `ไฟล์ต้องไม่เกิน ${BUG_SCREENSHOT_MAX_MB}MB`,
      );
    }
    const objectKey = await this.storage.uploadBugScreenshot(
      file.buffer,
      file.mimetype,
    );
    return { objectKey };
  }

  async create(
    supabaseId: string | undefined,
    dto: CreateBugReportDto,
    ip: string,
  ): Promise<CreateBugReportResult> {
    const reporterId = await this.resolveReporterId(supabaseId);
    await this.rateLimit.assertCanFile({ reporterId, ip });

    const created = await this.prisma.bugReport.create({
      data: {
        reporterId,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        category: dto.category,
        priority: this.computePriority(dto.severity, dto.category),
        pageUrl: dto.pageUrl,
        userAgent: dto.userAgent,
        viewport: dto.viewport,
        appVersion: dto.appVersion ?? null,
        screenshotKeys: dto.screenshotKeys.slice(0, 3),
        consoleLog: dto.consoleLog ?? null,
      },
      select: { id: true },
    });
    return { id: created.id };
  }

  async listMine(supabaseId: string): Promise<MyBugReport[]> {
    const reporterId = await this.resolveReporterId(supabaseId);
    if (!reporterId) return [];
    const rows = await this.prisma.bugReport.findMany({
      where: { reporterId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        severity: true,
        status: true,
        resolutionNote: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category as BugCategory,
      severity: r.severity as BugSeverity,
      status: r.status as BugStatus,
      resolutionNote: r.resolutionNote,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  // ── Admin ───────────────────────────────────────────────────────────

  async adminQueue(filters: {
    status?: BugStatus;
    severity?: BugSeverity;
    category?: BugCategory;
  }): Promise<AdminBugReportRow[]> {
    const rows = await this.prisma.bugReport.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      },
      // Postgres orders enums by their declared order (low→urgent), so desc
      // surfaces urgent first; then newest first within a priority.
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: { reporter: { select: { displayName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category as BugCategory,
      severity: r.severity as BugSeverity,
      status: r.status as BugStatus,
      priority: r.priority as BugPriority,
      viewport: r.viewport,
      reporterId: r.reporterId,
      reporterName: r.reporter?.displayName ?? null,
      assignedToId: r.assignedToId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async adminDetail(id: string): Promise<AdminBugReportDetail> {
    const r = await this.prisma.bugReport.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, displayName: true, email: true } },
      },
    });
    if (!r) throw new NotFoundException("ไม่พบบั๊กที่แจ้ง");
    const screenshotUrls = await this.storage.signEvidenceUrls(
      r.screenshotKeys,
    );
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category as BugCategory,
      severity: r.severity as BugSeverity,
      status: r.status as BugStatus,
      priority: r.priority as BugPriority,
      pageUrl: r.pageUrl,
      userAgent: r.userAgent,
      viewport: r.viewport,
      appVersion: r.appVersion,
      consoleLog: r.consoleLog,
      screenshotKeys: r.screenshotKeys,
      screenshotUrls,
      reporterId: r.reporterId,
      reporterName: r.reporter?.displayName ?? null,
      reporterEmail: r.reporter?.email ?? null,
      assignedToId: r.assignedToId,
      resolutionNote: r.resolutionNote,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async adminUpdate(
    id: string,
    dto: AdminUpdateBugReportDto,
  ): Promise<AdminBugReportDetail> {
    const existing = await this.prisma.bugReport.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("ไม่พบบั๊กที่แจ้ง");
    await this.prisma.bugReport.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assignedToId !== undefined
          ? { assignedToId: dto.assignedToId }
          : {}),
        ...(dto.resolutionNote !== undefined
          ? { resolutionNote: dto.resolutionNote }
          : {}),
      },
    });
    return this.adminDetail(id);
  }

  /**
   * Retention cron: purge screenshots from reports resolved >90 days ago,
   * or any report older than the 180-day hard cap. Deletes the objects and
   * clears screenshotKeys so the row keeps its triage history without the
   * (potentially PII-bearing) images.
   */
  async purgeOldScreenshots(now: Date = new Date()): Promise<{ purged: number }> {
    const ts = now.getTime();
    const candidates = await this.prisma.bugReport.findMany({
      where: {
        screenshotKeys: { isEmpty: false },
        OR: [
          {
            status: { in: RESOLVED_STATUSES },
            updatedAt: { lt: new Date(ts - RESOLVED_RETENTION_MS) },
          },
          { createdAt: { lt: new Date(ts - HARD_CAP_MS) } },
        ],
      },
      select: { id: true, screenshotKeys: true },
    });

    let purged = 0;
    for (const report of candidates) {
      for (const key of report.screenshotKeys) {
        try {
          await this.storage.deleteObject(key);
          purged++;
        } catch (err) {
          this.logger.warn(
            `purgeOldScreenshots: failed to delete ${key}: ${(err as Error).message}`,
          );
        }
      }
      await this.prisma.bugReport.update({
        where: { id: report.id },
        data: { screenshotKeys: [] },
      });
    }
    return { purged };
  }
}
