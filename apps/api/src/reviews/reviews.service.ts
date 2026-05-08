import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-TH-09: only students who completed and paid for a class can submit a review.
   */
  async create(supabaseId: string, dto: { bookingId: string; rating: number; text: string }) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException("Rating must be 1-5");
    }
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new BadRequestException("Unknown booking");
    if (booking.studentId !== user.id) {
      throw new BadRequestException("Not your booking");
    }
    if (booking.status !== "completed") {
      throw new BadRequestException("Booking is not completed");
    }
    return this.prisma.tutorReview.create({
      data: {
        bookingId: dto.bookingId,
        studentId: user.id,
        tutorId: booking.tutorId,
        rating: dto.rating,
        text: dto.text,
      },
    });
  }
}
