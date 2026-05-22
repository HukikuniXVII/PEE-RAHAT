import { Injectable } from "@nestjs/common";
import type { ReportTarget, ReportTargetContext } from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

/**
 * Result of resolving a polymorphic report target (FR-CM-05 / FR-SM-07 /
 * FR-PM-05). `ReportsService.create` 404s when `exists` is false; the admin
 * detail builder instead renders `context.kind === "missing"` so legacy /
 * deleted targets don't break the queue.
 */
export interface TargetResolution {
  /** False when the target row no longer exists (deleted, or a migrated stub). */
  exists: boolean;
  /**
   * Every user who is a party to the target — for a booking this is the
   * student AND the tutor; for everything else the single author / sender.
   * `ReportsService` picks `Report.targetUserId` from this set (the owner
   * that is not the reporter). Empty when the target is missing.
   */
  ownerUserIds: string[];
  /** Typed context for the admin detail right column. */
  context: ReportTargetContext;
  /** Booking this target belongs to — fills `Report.linkedBookingId`. */
  bookingId: string | null;
}

/** Escrow states that count as a completed sheet sale. */
const SOLD_STATUSES = [
  "held_in_escrow",
  "released_for_payout",
  "paid_out",
] as const;

function missing(): TargetResolution {
  return { exists: false, ownerUserIds: [], context: { kind: "missing" }, bookingId: null };
}

@Injectable()
export class TargetResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a `(targetType, targetId)` pair into its owning user(s), a
   * typed admin-render context, and the booking it belongs to (if any).
   */
  async resolve(
    targetType: ReportTarget,
    targetId: string,
  ): Promise<TargetResolution> {
    switch (targetType) {
      case "booking":
        return this.resolveBooking(targetId);
      case "chat_message":
        return this.resolveChatMessage(targetId);
      case "sheet":
        return this.resolveSheet(targetId);
      case "review":
        return this.resolveReview(targetId);
      case "community_post":
        return this.resolveCommunityPost(targetId);
      default:
        return missing();
    }
  }

  // booking → owner = student AND tutor (both are parties).
  private async resolveBooking(id: string): Promise<TargetResolution> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        student: true,
        tutor: { include: { user: true } },
        paymentIntent: true,
      },
    });
    if (!booking) return missing();
    return {
      exists: true,
      ownerUserIds: [booking.studentId, booking.tutor.userId],
      bookingId: booking.id,
      context: {
        kind: "booking",
        bookingId: booking.id,
        subject: booking.subject,
        status: booking.status,
        scheduledAt: booking.scheduledAt.toISOString(),
        amountThb: booking.amountThb,
        escrowStatus: booking.paymentIntent?.status ?? null,
        tutorDefectCount: booking.tutor.defectCount,
        studentName: booking.student.displayName,
        tutorName: booking.tutor.user.displayName,
      },
    };
  }

  // chat_message → owner = message sender; bookingId = thread.bookingId.
  private async resolveChatMessage(id: string): Promise<TargetResolution> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id },
      include: {
        thread: {
          include: {
            tutor: true,
            messages: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!message) return missing();
    const { thread } = message;
    const labelFor = (authorId: string, kind: string): string => {
      if (kind === "system") return "ระบบ";
      if (authorId === thread.studentId) return "นักเรียน";
      if (authorId === thread.tutor.userId) return "ติวเตอร์";
      return "ผู้ใช้";
    };
    return {
      exists: true,
      ownerUserIds: [message.authorId],
      bookingId: thread.bookingId,
      context: {
        kind: "chat_message",
        messageId: message.id,
        bookingId: thread.bookingId,
        // `redacted` is set by the chat anti-bypass filter at send time.
        bypassMatch: message.redacted,
        thread: thread.messages.map((m) => ({
          id: m.id,
          authorLabel: labelFor(m.authorId, m.kind),
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          isReported: m.id === message.id,
        })),
      },
    };
  }

  // sheet → owner = seller (StudySheet.sellerId → TutorProfile → User).
  private async resolveSheet(id: string): Promise<TargetResolution> {
    const sheet = await this.prisma.studySheet.findUnique({
      where: { id },
      include: { seller: { include: { user: true } } },
    });
    if (!sheet) return missing();
    const salesCount = await this.prisma.paymentIntent.count({
      where: { sheetId: sheet.id, status: { in: [...SOLD_STATUSES] } },
    });
    return {
      exists: true,
      ownerUserIds: [sheet.seller.userId],
      bookingId: null,
      context: {
        kind: "sheet",
        sheetId: sheet.id,
        title: sheet.title,
        subject: sheet.subject,
        priceThb: sheet.priceThb,
        salesCount,
        authorId: sheet.seller.userId,
        authorName: sheet.seller.user.displayName,
        removed: sheet.removed,
      },
    };
  }

  // review → owner = the student who wrote it.
  private async resolveReview(id: string): Promise<TargetResolution> {
    const review = await this.prisma.tutorReview.findUnique({
      where: { id },
      include: { student: true, tutor: { include: { user: true } } },
    });
    if (!review) return missing();
    return {
      exists: true,
      ownerUserIds: [review.studentId],
      bookingId: review.bookingId,
      context: {
        kind: "review",
        reviewId: review.id,
        rating: review.rating,
        text: review.text,
        bookingId: review.bookingId,
        studentName: review.student.displayName,
        tutorName: review.tutor.user.displayName,
        removed: review.removed,
      },
    };
  }

  // community_post → owner = post author.
  private async resolveCommunityPost(id: string): Promise<TargetResolution> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: { author: true },
    });
    if (!post) return missing();
    return {
      exists: true,
      ownerUserIds: [post.authorId],
      bookingId: null,
      context: {
        kind: "community_post",
        postId: post.id,
        title: post.title,
        content: post.content,
        authorId: post.authorId,
        authorName: post.author.displayName,
        removed: post.removed,
      },
    };
  }
}
