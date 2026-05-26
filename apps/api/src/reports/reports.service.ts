import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type {
  AddReportCommentDto,
  CreateReportDto,
  CreateReportResult,
  ReportDetail,
  ReportEventView,
  ReportEvidenceUploadResult,
  ReportListItem,
  ReportStatus,
} from "@peerahat/types";
import type { ReportEvent } from "@prisma/client";

import { readPositiveInt } from "../common/env";
import { StorageService } from "../common/storage.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportPriorityService } from "./report-priority.service";
import { ReportRateLimitService } from "./report-rate-limit.service";
import { TargetResolverService } from "./target-resolver.service";

/** MIME types accepted for report evidence (screenshots + PDFs). */
const EVIDENCE_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/** Minimal shape of a multipart file — avoids leaning on Express.Multer. */
export interface UploadedEvidenceFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * Report-system write paths (FR-CM-05 / FR-SM-07 / FR-PM-05): filing a
 * report and uploading its evidence. Reads / admin actions live in
 * separate services added in later steps.
 */
@Injectable()
export class ReportsService {
  private readonly maxEvidenceMb: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly targetResolver: TargetResolverService,
    private readonly priority: ReportPriorityService,
    private readonly rateLimit: ReportRateLimitService,
    private readonly notifications: NotificationService,
  ) {
    this.maxEvidenceMb = readPositiveInt("REPORT_MAX_EVIDENCE_MB", 10);
  }

  /** File a report. Enforces rate limits, resolves the target, computes
   *  auto-priority/SLA, and persists the row. */
  async create(
    supabaseId: string,
    dto: CreateReportDto,
  ): Promise<CreateReportResult> {
    const reporter = await this.requireUser(supabaseId);

    // Anti-abuse rate limits — throws 429 with a Thai message.
    await this.rateLimit.assertCanFile({
      reporterId: reporter.id,
      targetType: dto.targetType,
      targetId: dto.targetId,
    });

    // Evidence keys must be this reporter's own uploads.
    const evidencePrefix = `reports/${reporter.id}/`;
    for (const key of dto.evidenceKeys) {
      if (!key.startsWith(evidencePrefix)) {
        throw new BadRequestException("หลักฐานไม่ถูกต้อง");
      }
    }

    // Resolve the polymorphic target — 404 when it no longer exists.
    const resolution = await this.targetResolver.resolve(
      dto.targetType,
      dto.targetId,
    );
    if (!resolution.exists) {
      throw new NotFoundException("ไม่พบเป้าหมายที่รายงาน");
    }

    // You can't report your own content. For a booking the reporter is
    // one of the two parties, so the guard is skipped for bookings.
    if (
      dto.targetType !== "booking" &&
      resolution.ownerUserIds.length > 0 &&
      resolution.ownerUserIds.every((id) => id === reporter.id)
    ) {
      throw new ForbiddenException("ไม่สามารถรายงานเนื้อหาของตัวเองได้");
    }

    // targetUserId = the owner who is not the reporter (for a booking the
    // other party; otherwise the content owner). Used by the delayed
    // target-user notification — never exposes the reporter.
    const targetUserId =
      resolution.ownerUserIds.find((id) => id !== reporter.id) ??
      resolution.ownerUserIds[0] ??
      null;

    // Chat-bypass auto-detection (FR-CM-05): when the reported chat
    // message tripped the anti-bypass filter on send (the stored
    // `redacted` flag, surfaced by the resolver as bypassMatch), force
    // the off-platform category — unless the reporter already picked
    // something more specific than "other" — and float priority up.
    const chatCtx =
      resolution.context.kind === "chat_message" ? resolution.context : null;
    const bypassDetected = chatCtx?.bypassMatch ?? false;
    const category =
      bypassDetected && dto.category === "other"
        ? "off_platform_solicitation"
        : dto.category;

    const bookingCtx =
      resolution.context.kind === "booking" ? resolution.context : null;
    let { priority, slaDeadline } = this.priority.compute({
      reporter: {
        falseReportCount: reporter.falseReportCount,
        isMinor: this.isReporterMinor(),
      },
      category,
      target: {
        type: dto.targetType,
        bookingStatus: bookingCtx?.status ?? null,
        bookingScheduledAt: bookingCtx
          ? new Date(bookingCtx.scheduledAt)
          : null,
      },
    });
    if (bypassDetected && priority !== "urgent") {
      priority = "high";
      slaDeadline = this.priority.slaDeadlineFor("high");
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId: reporter.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetUserId,
        category,
        description: dto.description,
        evidenceKeys: dto.evidenceKeys,
        priority,
        slaDeadline,
        linkedBookingId: resolution.bookingId,
      },
    });

    // Notify the reporter. The target user is intentionally NOT notified
    // here — only when an admin moves the report to under_review.
    await this.notifications.notify({
      userId: reporter.id,
      type: "report_filed",
      title: "ส่งรายงานเรียบร้อย",
      body: "เราได้รับรายงานของคุณแล้ว ทีมงานจะตรวจสอบและตอบกลับโดยเร็ว",
      linkUrl: `/account/reports/${report.id}`,
      reportId: report.id,
    });

    return {
      id: report.id,
      status: report.status,
      slaDeadline: report.slaDeadline.toISOString(),
    };
  }

  /** Upload one evidence file (multipart) and return its object key. The
   *  5-file cap is enforced at report-creation time by createReportSchema. */
  async uploadEvidence(
    supabaseId: string,
    file: UploadedEvidenceFile | undefined,
  ): Promise<ReportEvidenceUploadResult> {
    const reporter = await this.requireUser(supabaseId);
    if (!file) throw new BadRequestException("ไม่พบไฟล์หลักฐาน");
    if (!EVIDENCE_ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException("รองรับเฉพาะไฟล์รูปภาพหรือ PDF");
    }
    if (file.size > this.maxEvidenceMb * 1024 * 1024) {
      throw new PayloadTooLargeException(
        `ไฟล์ต้องมีขนาดไม่เกิน ${this.maxEvidenceMb} MB`,
      );
    }
    const objectKey = await this.storage.uploadReportEvidence(
      reporter.id,
      file.buffer,
      file.mimetype,
    );
    return { objectKey };
  }

  /** The reporter's own filed reports, newest first. */
  async listMine(
    supabaseId: string,
    status?: ReportStatus,
  ): Promise<ReportListItem[]> {
    const reporter = await this.requireUser(supabaseId);
    const rows = await this.prisma.report.findMany({
      where: { reporterId: reporter.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      category: r.category,
      status: r.status,
      slaDeadline: r.slaDeadline.toISOString(),
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    }));
  }

  /** Reporter-facing report detail. Admin-only internal notes are stripped
   *  — the reporter sees only the timeline + their own follow-ups. */
  async getMineDetail(
    supabaseId: string,
    reportId: string,
  ): Promise<ReportDetail> {
    const reporter = await this.requireUser(supabaseId);
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
    if (!report) throw new NotFoundException("ไม่พบรายงาน");
    if (report.reporterId !== reporter.id) {
      throw new ForbiddenException();
    }
    const events = await Promise.all(
      report.events
        .filter((e) => e.kind !== "admin_note")
        .map((e) => this.toEventView(e)),
    );
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      category: report.category,
      description: report.description,
      evidenceUrls: await this.storage.signEvidenceUrls(report.evidenceKeys),
      status: report.status,
      slaDeadline: report.slaDeadline.toISOString(),
      createdAt: report.createdAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
      resolution: report.resolution,
      publicResponse: report.publicResponse,
      events,
      canComment:
        report.status === "pending" || report.status === "under_review",
    };
  }

  /** Add a reporter follow-up comment — allowed only while the report is
   *  still open (pending / under_review). */
  async addComment(
    supabaseId: string,
    reportId: string,
    dto: AddReportCommentDto,
  ): Promise<ReportEventView> {
    const reporter = await this.requireUser(supabaseId);
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException("ไม่พบรายงาน");
    if (report.reporterId !== reporter.id) {
      throw new ForbiddenException();
    }
    if (report.status !== "pending" && report.status !== "under_review") {
      throw new BadRequestException(
        "ไม่สามารถเพิ่มความคิดเห็นในรายงานที่ปิดแล้ว",
      );
    }
    const evidencePrefix = `reports/${reporter.id}/`;
    for (const key of dto.evidenceKeys) {
      if (!key.startsWith(evidencePrefix)) {
        throw new BadRequestException("หลักฐานไม่ถูกต้อง");
      }
    }
    const event = await this.prisma.reportEvent.create({
      data: {
        reportId,
        kind: "reporter_comment",
        authorId: reporter.id,
        text: dto.text,
        evidenceKeys: dto.evidenceKeys,
      },
    });
    return this.toEventView(event);
  }

  private async requireUser(supabaseId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException("Unknown user");
    return user;
  }

  private async toEventView(event: ReportEvent): Promise<ReportEventView> {
    return {
      id: event.id,
      kind: event.kind,
      // Role label only — this is the reporter's own report, so admin
      // actions read as "แอดมิน" and never carry an admin identity.
      authorLabel: event.kind === "reporter_comment" ? "คุณ" : "แอดมิน",
      text: event.text,
      evidenceUrls: await this.storage.signEvidenceUrls(event.evidenceKeys),
      createdAt: event.createdAt.toISOString(),
    };
  }

  /**
   * The under-18 priority escalation needs a date of birth, which the
   * User / StudentProfile models don't carry yet — so it stays dormant.
   * Single place to wire real age data once a DOB field exists.
   */
  private isReporterMinor(): boolean {
    return false;
  }
}
