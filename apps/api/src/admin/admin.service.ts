import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  AdminKycDetail,
  AdminKycQueueItem,
  AdminPassbookView,
  AdminPaymentRow,
  AdminPayoutDetail,
  AdminReport,
  PaymentItemType,
  PaymentStatus,
  ReportTargetType,
} from "@peerahat/types";

import type { AdminRevealedBankInfo, BankName } from "@peerahat/types";

import { AuditLogService } from "../common/audit-log.service";
import { CryptoService } from "../common/crypto.service";
import { StorageService } from "../common/storage.service";
import { GoogleCalendarService } from "../integrations/google-calendar/google-calendar.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * FR-TH-02 / PDPA: build the passbook + bank block for an admin surface
   * and write an AdminAuditLog row. Returns null when the tutor has no
   * passbook on file yet (pre-feature legacy). The signed URL is fresh on
   * every call — admin UIs must not cache it past the 5-minute expiry.
   */
  private async buildPassbookView(args: {
    adminId: string;
    targetType: "tutor" | "kyc" | "payout";
    targetId: string;
    passbookObjectKey: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    ip?: string;
  }): Promise<AdminPassbookView | null> {
    if (
      !args.passbookObjectKey ||
      !args.bankName ||
      !args.bankAccountNumber ||
      !args.bankAccountName
    ) {
      return null;
    }
    const signed = await this.storage.signDownload(args.passbookObjectKey);
    await this.audit.recordAdminAction({
      adminId: args.adminId,
      action: "view_passbook",
      targetType: args.targetType,
      targetId: args.targetId,
      ip: args.ip,
    });
    return {
      imageUrl: signed.url,
      imageExpiresAt: signed.expiresAt,
      bankName: args.bankName as BankName,
      bankAccountNumberFull: this.crypto.decrypt(args.bankAccountNumber),
      bankAccountName: args.bankAccountName,
    };
  }

  /**
   * FR-TH-02: per-submission KYC detail used by the admin review page.
   * The queue endpoint omits passbook + idName so the queue render stays
   * cheap and a passbook view doesn't get audit-logged on list load.
   */
  async kycById(
    adminId: string,
    submissionId: string,
    ip?: string,
  ): Promise<AdminKycDetail> {
    const sub = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
      include: { user: true },
    });
    if (!sub) throw new NotFoundException();
    const [idPhoto, selfie, transcript, passbook] = await Promise.all([
      this.storage.signDownload(sub.idPhotoKey),
      this.storage.signDownload(sub.selfieKey),
      this.storage.signDownload(sub.transcriptKey),
      this.buildPassbookView({
        adminId,
        targetType: "kyc",
        targetId: sub.id,
        passbookObjectKey: sub.passbookObjectKey,
        bankName: sub.bankName,
        bankAccountNumber: sub.bankAccountNumber,
        bankAccountName: sub.bankAccountName,
        ip,
      }),
    ]);
    return {
      id: sub.id,
      userId: sub.userId,
      userDisplayName: sub.user.displayName,
      userEmail: sub.user.email,
      idPhotoUrl: idPhoto.url,
      selfieUrl: selfie.url,
      transcriptUrl: transcript.url,
      idName: sub.idName,
      status: sub.status,
      rejectionReason: sub.rejectionReason,
      submittedAt: sub.submittedAt.toISOString(),
      reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
      passbook,
    };
  }

  /**
   * FR-TH-02: standalone passbook block for a tutor — used by the admin
   * tutor-detail page outside of a KYC or payout context. Tutor-level
   * passbook reflects the latest admin-approved KYC (mirrored on approve).
   */
  async tutorPassbook(
    adminId: string,
    tutorId: string,
    ip?: string,
  ): Promise<AdminPassbookView | null> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: {
        passbookObjectKey: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });
    if (!tutor) throw new NotFoundException();
    return this.buildPassbookView({
      adminId,
      targetType: "tutor",
      targetId: tutorId,
      passbookObjectKey: tutor.passbookObjectKey,
      bankName: tutor.bankName,
      bankAccountNumber: tutor.bankAccountNumber,
      bankAccountName: tutor.bankAccountName,
      ip,
    });
  }

  /**
   * FR-PM-06: per-payout detail. Same row shape as the list endpoint but
   * adds the tutor's current passbook block so the admin can sanity-check
   * the receiving bank account before clicking "mark transferred".
   */
  async payoutById(
    adminId: string,
    payoutId: string,
    ip?: string,
  ): Promise<AdminPayoutDetail> {
    const row = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { tutor: { include: { user: true } } },
    });
    if (!row) throw new NotFoundException();
    const passbook = await this.buildPassbookView({
      adminId,
      targetType: "payout",
      targetId: row.id,
      passbookObjectKey: row.tutor.passbookObjectKey,
      bankName: row.tutor.bankName,
      bankAccountNumber: row.tutor.bankAccountNumber,
      bankAccountName: row.tutor.bankAccountName,
      ip,
    });
    return {
      id: row.id,
      tutorId: row.tutorId,
      tutorDisplayName: row.tutor.user.displayName,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      grossThb: row.grossThb,
      commissionThb: row.commissionThb,
      withholdingTaxThb: row.withholdingTaxThb,
      netThb: row.netThb,
      scheduledAt: row.scheduledAt.toISOString(),
      status: row.status,
      transferredAt: row.transferredAt
        ? row.transferredAt.toISOString()
        : null,
      transferredBy: row.transferredBy,
      transferSlipKey: row.transferSlipKey,
      notes: row.notes,
      passbook,
    };
  }

  /**
   * FR-TH-02: admin reveal of a tutor's full bank account number. Used
   * when the admin is about to send the manual PromptPay transfer and
   * needs to copy/paste the full number into their banking app.
   *
   * Audit-logged via LoginAuditLog with a synthetic userAgent string —
   * keeps a permanent record of who revealed which tutor's account and
   * when, without needing a new dedicated audit table. NFR-05 retention
   * (≥90 days) covers it.
   */
  async revealBank(
    adminUserId: string,
    tutorId: string,
    requesterIp: string,
  ): Promise<AdminRevealedBankInfo> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: {
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });
    if (
      !tutor ||
      !tutor.bankAccountNumber ||
      !tutor.bankName ||
      !tutor.bankAccountName
    ) {
      throw new NotFoundException(
        "Tutor has no bank info on file — they may not have finished KYC yet",
      );
    }
    await this.prisma.loginAuditLog.create({
      data: {
        userId: adminUserId,
        ip: requesterIp,
        userAgent: `admin-reveal-bank:tutor=${tutorId}`,
      },
    });
    return {
      bankName: tutor.bankName as BankName,
      accountNumber: this.crypto.decrypt(tutor.bankAccountNumber),
      accountName: tutor.bankAccountName,
    };
  }

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
      // FR-TH-02: mirror passbook + bank info from the KYC submission to
      // TutorProfile so PayoutsService.queue can read it without joining
      // KycSubmission, and so /tutors/me/bank surfaces the same state.
      // bankAccountNumber stays encrypted (the value on the submission
      // is already the ciphertext blob — passing through verbatim).
      //
      // Admin approval is also the only place the User's role flips from
      // "student" to "tutor". TutorsService.onboard intentionally leaves
      // role unchanged so users who only filled the profile form (and
      // never finished KYC) don't get treated as tutors by role-gated
      // surfaces (dropdown, search visibility, etc.).
      await this.prisma.$transaction([
        this.prisma.tutorProfile.update({
          where: { userId: sub.userId },
          data: {
            isVerified: true,
            passbookObjectKey: sub.passbookObjectKey,
            bankName: sub.bankName,
            bankAccountNumber: sub.bankAccountNumber,
            bankAccountName: sub.bankAccountName,
            bankUpdatedAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: sub.userId },
          data: { role: "tutor" },
        }),
      ]);
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
        await this.googleCalendar.attachToBooking(booking.id);
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
   * tutor hadn't connected Google yet, attendee email rejected). This
   * endpoint deletes any existing event (best-effort 404 swallow) and
   * re-runs attachToBooking.
   *
   * If the tutor still hasn't connected Google, attachToBooking returns
   * meetingUrl=null and logs — admin can call this again later.
   */
  async regenerateMeet(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, googleCalendarEventId: true, tutorId: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.status !== "paid") {
      throw new BadRequestException(
        `Booking is ${booking.status}, not paid — Meet link is only generated for paid bookings`,
      );
    }

    if (booking.googleCalendarEventId) {
      await this.googleCalendar.deleteEvent(
        booking.tutorId,
        booking.googleCalendarEventId,
      );
    }
    // Clear so attachToBooking's idempotency check doesn't return the
    // stale link.
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        meetingUrl: null,
        googleCalendarEventId: null,
      },
    });

    return this.googleCalendar.attachToBooking(bookingId);
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
