import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  AdminKycQueueItem,
  AdminPaymentRow,
  AdminReport,
  PaymentItemType,
  PaymentStatus,
  ReportTargetType,
} from "@peerahat/types";

import { StorageService } from "../common/storage.service";
import { GoogleMeetService } from "../integrations/google-meet/google-meet.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly googleMeet: GoogleMeetService,
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

  // FR-PM-01: admin review surface for payment slips.
  //   pending  → mid-flight (slip_uploaded/verifying, present after API crash)
  //   success  → confirmed (held_in_escrow + released_for_payout + paid_out)
  //   failed   → ZercleSlip rejection; admin can override via approveSlip
  async paymentsQueue(
    filter: "pending" | "success" | "failed" = "pending",
  ): Promise<AdminPaymentRow[]> {
    const statuses: PaymentStatus[] =
      filter === "success"
        ? ["held_in_escrow", "released_for_payout", "paid_out"]
        : filter === "failed"
          ? ["failed"]
          : ["slip_uploaded", "verifying"];
    const rows = await this.prisma.paymentIntent.findMany({
      where: { status: { in: statuses } },
      orderBy: { createdAt: filter === "success" ? "desc" : "asc" },
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
      transactionId: r.transactionId,
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
      const booking = await this.prisma.booking.update({
        where: { id: intent.bookingId },
        data: { status: "paid", reportWindowEndsAt },
      });
      // FR-TH-17: generate Meet link inline; swallow failures so the
      // payment approval itself never depends on Calendar.
      try {
        if (this.googleMeet.isEnabled()) {
          await this.googleMeet.createForBooking(booking.id);
        } else {
          await this.googleMeet.postFallbackMessage(booking.id);
        }
      } catch (err) {
        this.logger.error(
          `Meet generation failed for booking ${booking.id}: ${(err as Error).message} — admin can retry`,
        );
      }
    }
    return updated;
  }

  /**
   * FR-TH-17: admin retry path for the inline Meet generator. The original
   * payment-confirm best-effort call may have failed (Calendar outage,
   * mis-configured service account, attendee email rejected). This endpoint
   * deletes any existing event (best-effort 404 swallow) and re-runs the
   * inline create.
   *
   * Idempotent: if Calendar is healthy and the link already exists,
   * deleting + recreating produces a fresh Meet URL — desirable because
   * the old link may be the reason admin is retrying.
   */
  async regenerateMeet(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, googleCalendarEventId: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.status !== "paid") {
      throw new BadRequestException(
        `Booking is ${booking.status}, not paid — Meet link is only generated for paid bookings`,
      );
    }

    if (booking.googleCalendarEventId) {
      await this.googleMeet.deleteEvent(booking.googleCalendarEventId);
    }
    // Clear so createForBooking's idempotency check doesn't return the
    // stale link.
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        meetingUrl: null,
        meetingGeneratedAt: null,
        googleCalendarEventId: null,
      },
    });

    if (this.googleMeet.isEnabled()) {
      return this.googleMeet.createForBooking(bookingId);
    }
    await this.googleMeet.postFallbackMessage(bookingId);
    return { meetingUrl: null, reused: false };
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
