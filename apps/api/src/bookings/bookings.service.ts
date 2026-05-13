import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { addHours } from "date-fns";

import { PrismaService } from "../prisma/prisma.service";

interface CreateBookingInput {
  tutorId: string;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(supabaseId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) return [];
    const rows = await this.prisma.booking.findMany({
      where: {
        OR: [
          { studentId: user.id },
          { tutor: { userId: user.id } },
        ],
      },
      include: { review: { select: { id: true } } },
      orderBy: { scheduledAt: "desc" },
    });
    return rows.map(({ review, ...b }) => ({
      ...b,
      hasReview: !!review,
      viewerSide:
        b.studentId === user.id ? ("student" as const) : ("tutor" as const),
    }));
  }

  async create(supabaseId: string, input: CreateBookingInput) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: input.tutorId },
    });
    if (!tutor) throw new NotFoundException();
    if (tutor.userId === user.id) {
      throw new ForbiddenException("ไม่สามารถจองคลาสของตัวเองได้");
    }

    const amountThb = Math.round(
      tutor.hourlyRate * (input.durationMinutes / 60),
    );

    const created = await this.prisma.booking.create({
      data: {
        studentId: user.id,
        tutorId: input.tutorId,
        subject: input.subject,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes,
        amountThb,
        acceptDeadlineAt: addHours(new Date(), 24),
        status: "requested",
      },
    });
    return { ...created, hasReview: false, viewerSide: "student" as const };
  }

  async accept(supabaseId: string, bookingId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.tutor.userId !== user.id) throw new ForbiddenException();
    if (booking.status !== "requested") {
      throw new BadRequestException("Booking is not in requested state");
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "accepted" },
    });
    return { ...updated, hasReview: false, viewerSide: "tutor" as const };
  }

  /**
   * FR-PM-05: student report inside the 24h window. Creates the Report
   * row and immediately freezes the linked escrow so admin has time to
   * review before the release timer fires. Mirrors AdminService.freezeBooking
   * for the payment-side effects but is owner-scoped (only the booking's
   * student can call this).
   */
  async report(
    supabaseId: string,
    bookingId: string,
    dto: { reason: string; details: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { paymentIntent: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.studentId !== user.id) throw new ForbiddenException();
    if (
      !booking.reportWindowEndsAt ||
      booking.reportWindowEndsAt.getTime() < Date.now()
    ) {
      throw new BadRequestException("Report window is not open");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.report.create({
        data: {
          reporterId: user.id,
          targetType: "booking",
          targetId: bookingId,
          reason: dto.reason,
          details: dto.details,
        },
      });
      // Only freeze if escrow is still holding. If it already released
      // into a payout (FR-PM-06) or was refunded, the dispute is handled
      // out-of-band by admin via the existing /admin/bookings/:id/freeze
      // path which has wider authority.
      if (booking.paymentIntent?.status === "held_in_escrow") {
        await tx.paymentIntent.update({
          where: { id: booking.paymentIntent.id },
          data: { status: "disputed" },
        });
      }
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "reported" },
      });
    });
  }
}
