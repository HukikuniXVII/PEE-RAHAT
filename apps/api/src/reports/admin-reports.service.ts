import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  type AdminReportDetail,
  type AdminReportQueueItem,
  type RelatedReportItem,
  type ReportPriority,
  type ReportStatus,
  type ReportTarget,
  type ResolveReportDto,
} from "@peerahat/types";
import type { Prisma, Report } from "@prisma/client";

import { AuditLogService } from "../common/audit-log.service";
import { StorageService } from "../common/storage.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportResolutionService } from "./report-resolution.service";
import { TargetResolverService } from "./target-resolver.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED = new Set<ReportStatus>(["resolved", "rejected", "duplicate"]);
/** Cap on a queue page — the admin scale stays small in Phase 1. */
const QUEUE_LIMIT = 200;

export interface ReportQueueFilters {
  status?: ReportStatus;
  priority?: ReportPriority;
  targetType?: ReportTarget;
  assignedToId?: string;
}

/**
 * Admin report operations (FR-CM-05 / FR-SM-07 / FR-PM-05): the moderation
 * queue, report detail with target context, and the assign / status /
 * resolve / duplicate / note actions. Every action writes an AdminAuditLog
 * row. Resolution downstream effects run inside ReportResolutionService.
 */
@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targetResolver: TargetResolverService,
    private readonly resolution: ReportResolutionService,
    private readonly audit: AuditLogService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationService,
  ) {}

  /** Moderation queue — priority desc, then closest-to-overdue first. */
  async queue(filters: ReportQueueFilters): Promise<AdminReportQueueItem[]> {
    const where: Prisma.ReportWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    const reports = await this.prisma.report.findMany({
      where,
      orderBy: [{ priority: "desc" }, { slaDeadline: "asc" }],
      take: QUEUE_LIMIT,
    });
    return this.buildQueueItems(reports);
  }

  /** Open reports already past their SLA deadline. */
  async overdue(): Promise<AdminReportQueueItem[]> {
    const reports = await this.prisma.report.findMany({
      where: {
        slaDeadline: { lt: new Date() },
        status: { notIn: ["resolved", "rejected", "duplicate"] },
      },
      orderBy: [{ priority: "desc" }, { slaDeadline: "asc" }],
      take: QUEUE_LIMIT,
    });
    return this.buildQueueItems(reports);
  }

  /** Full report detail with typed target context for the admin UI. */
  async detail(reportId: string): Promise<AdminReportDetail> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: true, events: { orderBy: { createdAt: "asc" } } },
    });
    if (!report) throw new NotFoundException("ไม่พบรายงาน");

    const [resolved, reportsFiled, related] = await Promise.all([
      this.targetResolver.resolve(report.targetType, report.targetId),
      this.prisma.report.count({ where: { reporterId: report.reporterId } }),
      this.related(reportId),
    ]);

    // Resolve event author names — admins see who acted; "ระบบ" for
    // system-generated timeline entries (authorId null).
    const authorIds = [
      ...new Set(
        report.events
          .map((e) => e.authorId)
          .filter((x): x is string => x !== null),
      ),
    ];
    const authors = authorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, displayName: true },
        })
      : [];
    const nameById = new Map(authors.map((u) => [u.id, u.displayName]));
    const events = await Promise.all(
      report.events.map(async (e) => ({
        id: e.id,
        kind: e.kind,
        authorLabel: e.authorId
          ? (nameById.get(e.authorId) ?? "ผู้ใช้")
          : "ระบบ",
        text: e.text,
        evidenceUrls: await this.storage.signEvidenceUrls(e.evidenceKeys),
        createdAt: e.createdAt.toISOString(),
      })),
    );

    let targetUser: AdminReportDetail["targetUser"] = null;
    if (report.targetUserId) {
      const tu = await this.prisma.user.findUnique({
        where: { id: report.targetUserId },
        select: {
          id: true,
          displayName: true,
          warningCount: true,
          suspendedUntil: true,
        },
      });
      if (tu) {
        targetUser = {
          id: tu.id,
          displayName: tu.displayName,
          warningCount: tu.warningCount,
          suspendedUntil: tu.suspendedUntil?.toISOString() ?? null,
        };
      }
    }

    const assignedToName = report.assignedToId
      ? ((
          await this.prisma.user.findUnique({
            where: { id: report.assignedToId },
            select: { displayName: true },
          })
        )?.displayName ?? null)
      : null;

    const now = Date.now();
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      targetUserId: report.targetUserId,
      category: report.category,
      description: report.description,
      evidenceUrls: await this.storage.signEvidenceUrls(report.evidenceKeys),
      status: report.status,
      priority: report.priority,
      slaDeadline: report.slaDeadline.toISOString(),
      overdue:
        report.slaDeadline.getTime() < now && !CLOSED.has(report.status),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
      resolution: report.resolution,
      resolutionNote: report.resolutionNote,
      publicResponse: report.publicResponse,
      linkedBookingId: report.linkedBookingId,
      parentReportId: report.parentReportId,
      assignedToId: report.assignedToId,
      assignedToName,
      bypassFlagged:
        resolved.context.kind === "chat_message" &&
        resolved.context.bypassMatch,
      reporter: {
        id: report.reporter.id,
        displayName: report.reporter.displayName,
        role: report.reporter.role,
        accountAgeDays: Math.floor(
          (now - report.reporter.createdAt.getTime()) / DAY_MS,
        ),
        reportsFiled,
        falseReportCount: report.reporter.falseReportCount,
        warningCount: report.reporter.warningCount,
      },
      targetUser,
      targetContext: resolved.context,
      events,
      related,
    };
  }

  /** Other reports filed against the same target. */
  async related(reportId: string): Promise<RelatedReportItem[]> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { targetType: true, targetId: true },
    });
    if (!report) throw new NotFoundException("ไม่พบรายงาน");
    const rows = await this.prisma.report.findMany({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        id: { not: reportId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      status: r.status,
      priority: r.priority,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Assign (or reassign) the report to an admin. */
  async assign(
    adminSupabaseId: string,
    reportId: string,
    adminId: string,
    ip?: string,
  ): Promise<void> {
    const admin = await this.requireAdmin(adminSupabaseId);
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true },
    });
    if (!report) throw new NotFoundException("ไม่พบรายงาน");
    const assignee = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { displayName: true, role: true },
    });
    if (!assignee || assignee.role !== "admin") {
      throw new BadRequestException("ผู้รับมอบหมายต้องเป็นแอดมิน");
    }
    await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { assignedToId: adminId },
      }),
      this.prisma.reportEvent.create({
        data: {
          reportId,
          kind: "assignment",
          authorId: admin.id,
          text: `มอบหมายให้ ${assignee.displayName}`,
        },
      }),
    ]);
    await this.audit.recordAdminAction({
      adminId: admin.id,
      action: "assign_report",
      targetType: "report",
      targetId: reportId,
      ip,
    });
  }

  /**
   * Change a report's status. Moving to `under_review` is the trigger for
   * the delayed target-user notification — wired in NotificationService.
   */
  async updateStatus(
    adminSupabaseId: string,
    reportId: string,
    status: ReportStatus,
    note: string | undefined,
    ip?: string,
  ): Promise<void> {
    const admin = await this.requireAdmin(adminSupabaseId);
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        targetType: true,
        targetUserId: true,
      },
    });
    if (!report) throw new NotFoundException("ไม่พบรายงาน");
    await this.prisma.$transaction(async (tx) => {
      await tx.report.update({ where: { id: reportId }, data: { status } });
      await tx.reportEvent.create({
        data: {
          reportId,
          kind: "status_change",
          authorId: admin.id,
          text: `เปลี่ยนสถานะเป็น "${REPORT_STATUS_LABELS[status]}"`,
        },
      });
      if (note) {
        await tx.reportEvent.create({
          data: {
            reportId,
            kind: "admin_note",
            authorId: admin.id,
            text: note,
          },
        });
      }
    });
    await this.audit.recordAdminAction({
      adminId: admin.id,
      action: "update_report_status",
      targetType: "report",
      targetId: reportId,
      ip,
    });

    // Delayed target-user notification — fires only on the transition
    // INTO under_review, never at file-time, and never names the reporter.
    if (
      status === "under_review" &&
      report.status !== "under_review" &&
      report.targetUserId
    ) {
      await this.notifications.notify({
        userId: report.targetUserId,
        type: "report_under_review",
        title: "มีรายงานเกี่ยวกับเนื้อหาของคุณ",
        body: `มีรายงานเกี่ยวกับ${REPORT_TARGET_LABELS[report.targetType]}ของคุณ — กำลังตรวจสอบโดยแอดมิน`,
        reportId,
      });
    }
  }

  /** Resolve a report — delegates the downstream effect to the resolution
   *  service (single transaction), then audit-logs the action. */
  async resolve(
    adminSupabaseId: string,
    reportId: string,
    dto: ResolveReportDto,
    ip?: string,
  ): Promise<void> {
    const admin = await this.requireAdmin(adminSupabaseId);
    await this.resolution.execute({ reportId, executedBy: admin.id, dto });
    await this.audit.recordAdminAction({
      adminId: admin.id,
      action: "resolve_report",
      targetType: "report",
      targetId: reportId,
      ip,
    });

    // Notifications fire AFTER the resolution transaction commits.
    const resolved = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        reporterId: true,
        targetUserId: true,
        targetType: true,
        publicResponse: true,
      },
    });
    if (resolved) {
      await this.sendResolutionNotifications(reportId, resolved, dto);
    }
  }

  /** Reporter + target-user notifications for a resolved report. The
   *  target user is never told who reported them. */
  private async sendResolutionNotifications(
    reportId: string,
    report: {
      reporterId: string;
      targetUserId: string | null;
      targetType: ReportTarget;
      publicResponse: string | null;
    },
    dto: ResolveReportDto,
  ): Promise<void> {
    const reporterLink = `/account/reports/${reportId}`;

    if (dto.resolution === "reporter_warned") {
      await this.notifications.notify({
        userId: report.reporterId,
        type: "report_reporter_warned",
        title: "การรายงานล่าสุดของคุณไม่เป็นความจริง",
        body: "กรุณารายงานอย่างมีหลักฐานเพื่อให้ทีมงานตรวจสอบได้ถูกต้อง",
        linkUrl: reporterLink,
        reportId,
      });
    } else {
      await this.notifications.notify({
        userId: report.reporterId,
        type: "report_resolved",
        title: "การรายงานของคุณได้รับการดำเนินการแล้ว",
        body:
          report.publicResponse ??
          "แอดมินได้ตรวจสอบและดำเนินการกับรายงานของคุณแล้ว",
        linkUrl: reporterLink,
        reportId,
      });
    }

    const targetUserId = report.targetUserId;
    if (!targetUserId) return;
    if (dto.resolution === "warning_issued") {
      await this.notifications.notify({
        userId: targetUserId,
        type: "report_warning",
        title: "บัญชีของคุณได้รับคำเตือน",
        body:
          report.publicResponse ?? "กรุณาปฏิบัติตามกฎของแพลตฟอร์ม Pee Rahat",
        reportId,
      });
    } else if (
      dto.resolution === "suspension_temp" ||
      dto.resolution === "suspension_perm" ||
      dto.resolution === "account_banned"
    ) {
      await this.notifications.notify({
        userId: targetUserId,
        type: "report_suspension",
        title: "บัญชีของคุณถูกพักการใช้งาน",
        body:
          report.publicResponse ??
          "บัญชีของคุณถูกพักการใช้งานจากผลการตรวจสอบของแอดมิน",
        reportId,
      });
    } else if (dto.resolution === "content_removed") {
      await this.notifications.notify({
        userId: targetUserId,
        type: "report_content_removed",
        title: "เนื้อหาของคุณถูกซ่อน",
        body: `เหตุผล: ${dto.removedReason ?? "ละเมิดกฎของแพลตฟอร์ม"}`,
        reportId,
      });
    }
  }

  /** Add a free-form admin-only internal note. */
  async addNote(
    adminSupabaseId: string,
    reportId: string,
    text: string,
    ip?: string,
  ): Promise<void> {
    const admin = await this.requireAdmin(adminSupabaseId);
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true },
    });
    if (!report) throw new NotFoundException("ไม่พบรายงาน");
    await this.prisma.reportEvent.create({
      data: { reportId, kind: "admin_note", authorId: admin.id, text },
    });
    await this.audit.recordAdminAction({
      adminId: admin.id,
      action: "add_report_note",
      targetType: "report",
      targetId: reportId,
      ip,
    });
  }

  /** Cluster a report as a duplicate of an earlier one. */
  async markDuplicate(
    adminSupabaseId: string,
    reportId: string,
    parentReportId: string,
    ip?: string,
  ): Promise<void> {
    const admin = await this.requireAdmin(adminSupabaseId);
    if (reportId === parentReportId) {
      throw new BadRequestException("ไม่สามารถทำเครื่องหมายซ้ำกับตัวเองได้");
    }
    const [report, parent] = await Promise.all([
      this.prisma.report.findUnique({
        where: { id: reportId },
        select: { id: true },
      }),
      this.prisma.report.findUnique({
        where: { id: parentReportId },
        select: { id: true },
      }),
    ]);
    if (!report) throw new NotFoundException("ไม่พบรายงาน");
    if (!parent) throw new BadRequestException("ไม่พบรายงานต้นทาง");
    await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { status: "duplicate", parentReportId },
      }),
      this.prisma.reportEvent.create({
        data: {
          reportId,
          kind: "status_change",
          authorId: admin.id,
          text: `ทำเครื่องหมายว่าซ้ำกับรายงาน ${parentReportId}`,
        },
      }),
    ]);
    await this.audit.recordAdminAction({
      adminId: admin.id,
      action: "mark_report_duplicate",
      targetType: "report",
      targetId: reportId,
      ip,
    });
  }

  private async requireAdmin(supabaseId: string): Promise<{ id: string }> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException("Unknown admin");
    return user;
  }

  /** Map report rows into queue items, batching the reporter + assignee
   *  lookups so the queue stays a small fixed number of queries. */
  private async buildQueueItems(
    reports: Report[],
  ): Promise<AdminReportQueueItem[]> {
    if (reports.length === 0) return [];
    const reporterIds = [...new Set(reports.map((r) => r.reporterId))];
    const assigneeIds = [
      ...new Set(
        reports
          .map((r) => r.assignedToId)
          .filter((x): x is string => x !== null),
      ),
    ];
    const [reporters, counts, assignees] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: reporterIds } },
        select: {
          id: true,
          displayName: true,
          role: true,
          createdAt: true,
          falseReportCount: true,
          warningCount: true,
        },
      }),
      this.prisma.report.groupBy({
        by: ["reporterId"],
        where: { reporterId: { in: reporterIds } },
        _count: { _all: true },
      }),
      assigneeIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, displayName: true },
          })
        : Promise.resolve([]),
    ]);
    const reporterById = new Map(reporters.map((u) => [u.id, u]));
    const countById = new Map(
      counts.map((c) => [c.reporterId, c._count._all]),
    );
    const assigneeById = new Map(assignees.map((u) => [u.id, u.displayName]));
    const now = Date.now();

    return reports.map((r) => {
      const reporter = reporterById.get(r.reporterId);
      return {
        id: r.id,
        targetType: r.targetType,
        category: r.category,
        priority: r.priority,
        status: r.status,
        slaDeadline: r.slaDeadline.toISOString(),
        overdue: r.slaDeadline.getTime() < now && !CLOSED.has(r.status),
        description: r.description,
        reporter: {
          id: r.reporterId,
          displayName: reporter?.displayName ?? "—",
          role: reporter?.role ?? "student",
          accountAgeDays: reporter
            ? Math.floor((now - reporter.createdAt.getTime()) / DAY_MS)
            : 0,
          reportsFiled: countById.get(r.reporterId) ?? 0,
          falseReportCount: reporter?.falseReportCount ?? 0,
          warningCount: reporter?.warningCount ?? 0,
        },
        assignedToId: r.assignedToId,
        assignedToName: r.assignedToId
          ? (assigneeById.get(r.assignedToId) ?? null)
          : null,
        // Cheap queue heuristic — the detail view uses the real
        // bypassMatch off the resolved chat-message context.
        bypassFlagged:
          r.targetType === "chat_message" &&
          r.category === "off_platform_solicitation",
        createdAt: r.createdAt.toISOString(),
      };
    });
  }
}
