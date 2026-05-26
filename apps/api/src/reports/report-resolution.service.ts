import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  REPORT_CLOSED_STATUSES,
  REPORT_RESOLUTION_LABELS,
  type RefundSplitDto,
  type ReportStatus,
  type ResolveReportDto,
} from "@peerahat/types";
import type { Prisma, Report } from "@prisma/client";

import { readPositiveInt } from "../common/env";
import { PrismaService } from "../prisma/prisma.service";

/** suspension_perm / account_banned park suspendedUntil far in the future. */
const PERMANENT_SUSPENSION_UNTIL = new Date("2099-12-31T23:59:59.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ExecuteResolutionArgs {
  reportId: string;
  /** Admin user id performing the resolution. */
  executedBy: string;
  dto: ResolveReportDto;
}

/**
 * Report resolution → downstream actions (FR-CM-05 / FR-SM-07 / FR-PM-05).
 *
 * Every resolution and its side effects run inside a single transaction
 * with the report status update — any error rolls back both, so a half-
 * applied suspension or refund can never be observed. Nothing here is
 * automatic: each call is triggered by an explicit admin click.
 *
 * In-app notifications are emitted by the caller (admin resolve endpoint)
 * after this commits — never inside the transaction.
 */
@Injectable()
export class ReportResolutionService {
  private readonly tempSuspensionDays: number;

  constructor(private readonly prisma: PrismaService) {
    this.tempSuspensionDays = readPositiveInt(
      "REPORT_SUSPENSION_TEMP_DEFAULT_DAYS",
      7,
    );
  }

  /** Apply a resolution and its downstream effect, then close the report. */
  async execute(args: ExecuteResolutionArgs): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: args.reportId },
      });
      if (!report) throw new NotFoundException("ไม่พบรายงาน");
      if (REPORT_CLOSED_STATUSES.includes(report.status as ReportStatus)) {
        throw new BadRequestException("รายงานนี้ถูกปิดไปแล้ว");
      }

      await this.applyDownstream(tx, report, args.dto);

      await tx.report.update({
        where: { id: report.id },
        data: {
          status: "resolved",
          resolution: args.dto.resolution,
          resolvedAt: new Date(),
          resolutionNote: args.dto.resolutionNote,
          publicResponse: args.dto.publicResponse ?? null,
          assignedToId: report.assignedToId ?? args.executedBy,
        },
      });

      await tx.reportEvent.create({
        data: {
          reportId: report.id,
          kind: "resolution",
          authorId: args.executedBy,
          text: `ปิดเรื่อง: ${REPORT_RESOLUTION_LABELS[args.dto.resolution]}`,
        },
      });
    });
  }

  private async applyDownstream(
    tx: Prisma.TransactionClient,
    report: Report,
    dto: ResolveReportDto,
  ): Promise<void> {
    switch (dto.resolution) {
      case "no_action":
        return;

      case "warning_issued":
        await tx.user.update({
          where: { id: this.requireTargetUser(report) },
          data: { warningCount: { increment: 1 } },
        });
        return;

      case "reporter_warned":
        // The report itself was found baseless — penalise the reporter.
        await tx.user.update({
          where: { id: report.reporterId },
          data: { falseReportCount: { increment: 1 } },
        });
        return;

      case "suspension_temp": {
        const days = dto.suspensionDays ?? this.tempSuspensionDays;
        await this.suspendUser(
          tx,
          report,
          new Date(Date.now() + days * DAY_MS),
          false,
        );
        return;
      }

      case "suspension_perm":
      case "account_banned":
        // Stateless Supabase JWT — "revoke all sessions" is enforced by the
        // auth guard reading suspendedUntil, so a permanent ban and a
        // permanent suspension are the same downstream effect here.
        await this.suspendUser(tx, report, PERMANENT_SUSPENSION_UNTIL, true);
        return;

      case "content_removed":
        await this.removeContent(tx, report, dto.removedReason);
        return;

      case "refund_full":
        await this.refundBooking(tx, report, "full", dto.tutorAtFault ?? false);
        return;

      case "refund_partial":
        await this.refundBooking(tx, report, "partial", false, dto.refundSplit);
        return;
    }
  }

  /** A report with no resolved target owner can't take a user-level action. */
  private requireTargetUser(report: Report): string {
    if (!report.targetUserId) {
      throw new BadRequestException("รายงานนี้ไม่มีผู้ใช้เป้าหมาย");
    }
    return report.targetUserId;
  }

  private async suspendUser(
    tx: Prisma.TransactionClient,
    report: Report,
    until: Date,
    cancelFutureBookings: boolean,
  ): Promise<void> {
    const userId = this.requireTargetUser(report);
    await tx.user.update({
      where: { id: userId },
      data: { suspendedUntil: until },
    });
    if (cancelFutureBookings) {
      await this.cancelFutureBookings(tx, userId, report.id);
    }
  }

  /** Permanent-suspension cleanup: cancel the user's still-upcoming
   *  bookings (as student or tutor) and 100%-refund any held escrow. */
  private async cancelFutureBookings(
    tx: Prisma.TransactionClient,
    userId: string,
    reportId: string,
  ): Promise<void> {
    const tutorProfile = await tx.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    const orClauses: Prisma.BookingWhereInput[] = [{ studentId: userId }];
    if (tutorProfile) orClauses.push({ tutorId: tutorProfile.id });

    const bookings = await tx.booking.findMany({
      where: {
        status: { in: ["paid", "accepted"] },
        scheduledAt: { gt: new Date() },
        OR: orClauses,
      },
      include: { paymentIntent: true },
    });

    for (const booking of bookings) {
      const intent = booking.paymentIntent;
      if (
        intent &&
        (intent.status === "held_in_escrow" ||
          intent.status === "released_for_payout")
      ) {
        const original = intent.originalAmountThb ?? intent.amountThb;
        await tx.paymentIntent.update({
          where: { id: intent.id },
          data: {
            status: "refunded",
            amountThb: 0,
            originalAmountThb: original,
          },
        });
        await tx.refundLedger.create({
          data: {
            paymentIntentId: intent.id,
            bookingId: booking.id,
            originalAmountThb: original,
            studentRefundThb: original,
            tutorThb: 0,
            platformThb: 0,
            reasonCode: "admin_manual",
            reportId,
          },
        });
      }
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "cancelled" },
      });
    }
  }

  private async removeContent(
    tx: Prisma.TransactionClient,
    report: Report,
    removedReason: string | undefined,
  ): Promise<void> {
    if (!removedReason) {
      throw new BadRequestException("ต้องระบุเหตุผลการซ่อนเนื้อหา");
    }
    const removed = { removed: true, removedReason, removedAt: new Date() };
    switch (report.targetType) {
      case "sheet":
        await tx.studySheet.update({
          where: { id: report.targetId },
          data: removed,
        });
        return;
      case "review":
        await tx.tutorReview.update({
          where: { id: report.targetId },
          data: removed,
        });
        return;
      case "community_post":
        await tx.communityPost.update({
          where: { id: report.targetId },
          data: removed,
        });
        return;
      case "chat_message":
        // ChatMessage has no `removed` column — `redacted` is its
        // existing moderation flag, so reuse it.
        await tx.chatMessage.update({
          where: { id: report.targetId },
          data: { redacted: true },
        });
        return;
      case "booking":
        throw new BadRequestException("ไม่สามารถซ่อนการจองได้");
    }
  }

  private async refundBooking(
    tx: Prisma.TransactionClient,
    report: Report,
    mode: "full" | "partial",
    tutorAtFault: boolean,
    split?: RefundSplitDto,
  ): Promise<void> {
    if (!report.linkedBookingId) {
      throw new BadRequestException("รายงานนี้ไม่ได้เชื่อมกับการจอง");
    }
    const booking = await tx.booking.findUnique({
      where: { id: report.linkedBookingId },
      include: { paymentIntent: true },
    });
    if (!booking?.paymentIntent) {
      throw new BadRequestException("ไม่พบการชำระเงินของการจอง");
    }
    const intent = booking.paymentIntent;
    const original = intent.originalAmountThb ?? intent.amountThb;

    let studentRefundThb: number;
    let tutorThb: number;
    let platformThb: number;
    if (mode === "full") {
      studentRefundThb = original;
      tutorThb = 0;
      platformThb = 0;
    } else {
      if (!split) {
        throw new BadRequestException("ต้องระบุสัดส่วนเงินคืน");
      }
      studentRefundThb = Math.round((original * split.studentPct) / 100);
      tutorThb = Math.round((original * split.tutorPct) / 100);
      // Platform absorbs any rounding remainder so the split always sums.
      platformThb = original - studentRefundThb - tutorThb;
    }

    // The payout batch excludes refunded / partially_refunded intents, so
    // the tutor portion of a dispute split is not auto-paid out.
    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: studentRefundThb >= original ? "refunded" : "partially_refunded",
        amountThb: tutorThb,
        originalAmountThb: original,
      },
    });
    await tx.refundLedger.create({
      data: {
        paymentIntentId: intent.id,
        bookingId: booking.id,
        originalAmountThb: original,
        studentRefundThb,
        tutorThb,
        platformThb,
        reasonCode: "admin_manual",
        reportId: report.id,
      },
    });
    if (mode === "full" && tutorAtFault) {
      await tx.tutorProfile.update({
        where: { id: booking.tutorId },
        data: { defectCount: { increment: 1 } },
      });
    }
  }
}
