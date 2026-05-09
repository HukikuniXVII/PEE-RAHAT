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
    return rows.map(({ review, ...b }) => ({ ...b, hasReview: !!review }));
  }

  async create(supabaseId: string, input: CreateBookingInput) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: input.tutorId },
    });
    if (!tutor) throw new NotFoundException();

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
    return { ...created, hasReview: false };
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
    return { ...updated, hasReview: false };
  }

  async report(supabaseId: string, bookingId: string, dto: { reason: string; details: string }) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    await this.prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: "post",
        targetId: bookingId,
        reason: dto.reason,
        details: dto.details,
      },
    });
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "reported" },
    });
  }
}
