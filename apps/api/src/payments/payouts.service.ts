import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { pricePayout } from "./pricing";

/**
 * FR-PM-06: payouts batch the 15th and 30th of each month.
 * FR-PM-07: 3% withholding tax deducted per Thai law.
 *
 * This service is the pure computation layer the cron / admin
 * trigger will call; no scheduler is wired yet (TODO: BullMQ).
 * Pricing constants live in ./pricing so the seed can import them.
 */

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate every released-escrow booking inside the period into one
   * Payout per tutor. Idempotent: a tutor with no eligible bookings is
   * skipped; bookings already attached to a prior Payout are not
   * re-counted (TODO: requires a Booking → Payout link, see schema TODO).
   */
  async computeForPeriod(periodStart: Date, periodEnd: Date) {
    if (periodEnd <= periodStart) {
      throw new BadRequestException("periodEnd must be after periodStart");
    }
    const releasedIntents = await this.prisma.paymentIntent.findMany({
      where: {
        status: "released",
        itemType: "booking",
        releasedAt: { gte: periodStart, lt: periodEnd },
        bookingId: { not: null },
      },
      include: { booking: true },
    });

    const byTutor = new Map<string, number>();
    for (const intent of releasedIntents) {
      if (!intent.booking) continue;
      const tutorId = intent.booking.tutorId;
      byTutor.set(tutorId, (byTutor.get(tutorId) ?? 0) + intent.amountThb);
    }

    const created = [];
    for (const [tutorId, gross] of byTutor) {
      const pricing = pricePayout(gross);
      const payout = await this.prisma.payout.create({
        data: {
          tutorId,
          periodStart,
          periodEnd,
          ...pricing,
          scheduledAt: periodEnd,
        },
      });
      created.push(payout);
    }
    return { count: created.length, payouts: created };
  }

  list(opts: { from?: Date; to?: Date; paid?: boolean }) {
    return this.prisma.payout.findMany({
      where: {
        ...(opts.from || opts.to
          ? { scheduledAt: { gte: opts.from, lte: opts.to } }
          : {}),
        ...(opts.paid === true
          ? { paidAt: { not: null } }
          : opts.paid === false
            ? { paidAt: null }
            : {}),
      },
      orderBy: { scheduledAt: "desc" },
      include: { tutor: { include: { user: true } } },
    });
  }

  async markPaid(payoutId: string) {
    const existing = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!existing) throw new NotFoundException();
    if (existing.paidAt) throw new BadRequestException("Payout already marked paid");
    return this.prisma.payout.update({
      where: { id: payoutId },
      data: { paidAt: new Date() },
    });
  }
}
