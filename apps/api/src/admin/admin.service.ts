import { Injectable, NotFoundException } from "@nestjs/common";
import type { AdminReport, ReportTargetType } from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listReports({
    page = 1,
    pageSize = 20,
    status,
  }: {
    page?: number;
    pageSize?: number;
    status?: "open" | "resolved";
  }): Promise<{
    items: AdminReport[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const where =
      status === "open"
        ? { resolvedAt: null }
        : status === "resolved"
          ? { resolvedAt: { not: null } }
          : {};
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: { reporter: true },
      }),
      this.prisma.report.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        reporterId: r.reporterId,
        reporterDisplayName: r.reporter.displayName,
        targetType: r.targetType as ReportTargetType,
        targetId: r.targetId,
        reason: r.reason,
        details: r.details,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async resolveReport(reportId: string): Promise<AdminReport> {
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { resolvedAt: new Date() },
      include: { reporter: true },
    });
    return {
      id: updated.id,
      reporterId: updated.reporterId,
      reporterDisplayName: updated.reporter.displayName,
      targetType: updated.targetType as ReportTargetType,
      targetId: updated.targetId,
      reason: updated.reason,
      details: updated.details,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  kycQueue() {
    return this.prisma.kycSubmission.findMany({
      where: { status: "pending" },
      orderBy: { submittedAt: "asc" },
      include: { user: true },
    });
  }

  async reviewKyc(id: string, decision: "approve" | "reject", reason?: string) {
    const sub = await this.prisma.kycSubmission.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException();

    if (decision === "approve") {
      await this.prisma.tutorProfile.update({
        where: { userId: sub.userId },
        data: { isVerified: true },
      });
    }
    return this.prisma.kycSubmission.update({
      where: { id },
      data: {
        status: decision === "approve" ? "verified" : "rejected",
        reviewedAt: new Date(),
        rejectionReason: decision === "reject" ? reason : null,
      },
    });
  }

  paymentsQueue() {
    return this.prisma.paymentIntent.findMany({
      where: { status: { in: ["slip_uploaded", "verifying"] } },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * FR-PM-05: admin response to a Report-Issue. Marks the linked payment
   * intent `disputed` so it never enters the next payout batch (FR-PM-06)
   * and records the dispute on the booking. Resolution (refund vs release)
   * happens via separate admin actions once the dispute is investigated.
   */
  async freezeBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { paymentIntent: true },
    });
    if (!booking) throw new NotFoundException();

    if (booking.paymentIntent) {
      await this.prisma.paymentIntent.update({
        where: { id: booking.paymentIntent.id },
        data: { status: "disputed" },
      });
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "reported" },
    });
  }
}
