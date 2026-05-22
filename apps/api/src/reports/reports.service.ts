import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type {
  CreateReportDto,
  CreateReportResult,
  ReportEvidenceUploadResult,
} from "@peerahat/types";

import { StorageService } from "../common/storage.service";
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

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return n;
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
  ) {
    this.maxEvidenceMb = readPositiveInt("REPORT_MAX_EVIDENCE_MB", 10);
  }

  /** File a report. Enforces rate limits, resolves the target, computes
   *  auto-priority/SLA, and persists the row. */
  async create(
    supabaseId: string,
    dto: CreateReportDto,
  ): Promise<CreateReportResult> {
    const reporter = await this.prisma.user.findUnique({
      where: { supabaseId },
    });
    if (!reporter) throw new BadRequestException("Unknown user");

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

    // The "report filed" reporter notification is wired in step 11
    // (NotificationService). The target user is intentionally NOT
    // notified here — only when an admin moves status to under_review.

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
    const reporter = await this.prisma.user.findUnique({
      where: { supabaseId },
    });
    if (!reporter) throw new BadRequestException("Unknown user");
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

  /**
   * The under-18 priority escalation needs a date of birth, which the
   * User / StudentProfile models don't carry yet — so it stays dormant.
   * Single place to wire real age data once a DOB field exists.
   */
  private isReporterMinor(): boolean {
    return false;
  }
}
