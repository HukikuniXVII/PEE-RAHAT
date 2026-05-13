import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminKycQueueItem,
  AdminPaymentRow,
  AdminReport,
  PaymentItemType,
  PaymentStatus,
  ReportTargetType,
} from "@peerahat/types";

import { StorageService } from "../common/storage.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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

  // FR-TH-02: queue includes 5-minute signed GETs for the three photos so
  // the admin UI can render them directly. Signing inline (rather than a
  // separate endpoint per submission) keeps the queue page a single round
  // trip; the queue stays small at Phase 1 manual-review scale.
  async kycQueue(): Promise<AdminKycQueueItem[]> {
    const rows = await this.prisma.kycSubmission.findMany({
      where: { status: "pending" },
      orderBy: { submittedAt: "asc" },
      include: { user: true },
    });
    return Promise.all(
      rows.map(async (r) => {
        const [idPhoto, selfie, transcript] = await Promise.all([
          this.storage.signDownload(r.idPhotoKey),
          this.storage.signDownload(r.selfieKey),
          this.storage.signDownload(r.transcriptKey),
        ]);
        return {
          id: r.id,
          userId: r.userId,
          userDisplayName: r.user.displayName,
          userEmail: r.user.email,
          idPhotoUrl: idPhoto.url,
          selfieUrl: selfie.url,
          transcriptUrl: transcript.url,
          submittedAt: r.submittedAt.toISOString(),
        };
      }),
    );
  }

  async reviewKyc(id: string, decision: "approve" | "reject", reason?: string) {
    const sub = await this.prisma.kycSubmission.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException();

    if (decision === "approve") {
      // A user can upload KYC photos before completing /tutors/onboarding,
      // so the TutorProfile row may not exist yet. Block approval with a
      // clear message instead of letting Prisma throw P2025.
      const profile = await this.prisma.tutorProfile.findUnique({
        where: { userId: sub.userId },
      });
      if (!profile) {
        throw new BadRequestException(
          "ผู้ใช้ยังไม่ได้กรอกข้อมูลพี่ติว — ขอให้ทำขั้นตอน Onboarding ก่อนจึงอนุมัติได้",
        );
      }
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

  async paymentsQueue(): Promise<AdminPaymentRow[]> {
    // FR-PM-01: surface anything needing a human — mid-flight states
    // (slip_uploaded/verifying, usually only present after an API crash)
    // plus SlipOK rejections (failed) so admin can override mismatches or
    // foreign-bank slips. approveSlip/rejectSlip already accept "failed".
    const rows = await this.prisma.paymentIntent.findMany({
      where: { status: { in: ["slip_uploaded", "verifying", "failed"] } },
      orderBy: { createdAt: "asc" },
      include: { payer: true },
    });
    return rows.map((r) => ({
      id: r.id,
      payerId: r.payerId,
      payerDisplayName: r.payer.displayName,
      itemType: r.itemType as PaymentItemType,
      bookingId: r.bookingId,
      sheetId: r.sheetId,
      amountThb: r.amountThb,
      status: r.status as PaymentStatus,
      slipObjectKey: r.slipObjectKey,
      slipOkRef: r.slipOkRef,
      failureReason: r.failureReason,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * FR-PM-01: manual override for cases SlipOK can't decide on its own
   * (timeouts, ambiguous slip, foreign-bank transfers). Approving moves
   * funds into escrow and starts the booking's 24h report window
   * (FR-PM-05) — same end-state as a clean SlipOK pass.
   */
  async approveSlip(intentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent) throw new NotFoundException();
    if (
      intent.status !== "slip_uploaded" &&
      intent.status !== "verifying" &&
      intent.status !== "failed"
    ) {
      throw new BadRequestException("Intent is not awaiting admin review");
    }

    const updated = await this.prisma.paymentIntent.update({
      where: { id: intentId },
      data: { status: "held_in_escrow", failureReason: null },
    });
    if (intent.bookingId) {
      const reportWindowEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.prisma.booking.update({
        where: { id: intent.bookingId },
        data: { status: "paid", reportWindowEndsAt },
      });
    }
    return updated;
  }

  async rejectSlip(intentId: string, reason: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent) throw new NotFoundException();
    return this.prisma.paymentIntent.update({
      where: { id: intentId },
      data: { status: "failed", failureReason: reason },
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
