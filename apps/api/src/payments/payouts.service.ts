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
   * Payout per tutor. Idempotent at the intent level: each PaymentIntent
   * carries a payoutId once consumed, and the eligibility query filters
   * `payoutId: null` so a second call for an overlapping window can
   * never re-count the same release.
   *
   * TODO: concurrent admin invocations can still race (both see the same
   * unlinked set). A SERIALIZABLE transaction or Postgres advisory lock
   * around the whole method would close that gap; manual flow makes it
   * unlikely in Phase 1.
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
        payoutId: null,
      },
      include: { booking: true },
    });

    const byTutor = new Map<string, { gross: number; intentIds: string[] }>();
    for (const intent of releasedIntents) {
      if (!intent.booking) continue;
      const tutorId = intent.booking.tutorId;
      const bucket = byTutor.get(tutorId) ?? { gross: 0, intentIds: [] };
      bucket.gross += intent.amountThb;
      bucket.intentIds.push(intent.id);
      byTutor.set(tutorId, bucket);
    }

    const created = [];
    for (const [tutorId, bucket] of byTutor) {
      const pricing = pricePayout(bucket.gross);
      const payout = await this.prisma.$transaction(async (tx) => {
        const created = await tx.payout.create({
          data: {
            tutorId,
            periodStart,
            periodEnd,
            ...pricing,
            scheduledAt: periodEnd,
          },
        });
        await tx.paymentIntent.updateMany({
          where: { id: { in: bucket.intentIds } },
          data: { payoutId: created.id },
        });
        return created;
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

  /**
   * Wrapper for the cron job (15th + 30th of each month). Picks the
   * window as `[max(periodEnd of any prior payout) … now]` so windows
   * are always contiguous; falls back to 60 days ago on first run.
   * Idempotent for the same reasons computeForPeriod is — already-linked
   * intents are excluded by payoutId IS NULL.
   */
  async runScheduledPayout() {
    const last = await this.prisma.payout.findFirst({
      orderBy: { periodEnd: "desc" },
    });
    const periodStart =
      last?.periodEnd ?? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    return this.computeForPeriod(periodStart, periodEnd);
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
