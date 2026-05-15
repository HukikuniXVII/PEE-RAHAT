import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AdminPayoutQueueGroup, AdminPayoutRow } from "@peerahat/types";

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
        status: "released_for_payout",
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

  async list(opts: {
    from?: Date;
    to?: Date;
    paid?: boolean;
  }): Promise<AdminPayoutRow[]> {
    const rows = await this.prisma.payout.findMany({
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
    return rows.map((r) => ({
      id: r.id,
      tutorId: r.tutorId,
      tutorDisplayName: r.tutor.user.displayName,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      grossThb: r.grossThb,
      commissionThb: r.commissionThb,
      withholdingTaxThb: r.withholdingTaxThb,
      netThb: r.netThb,
      scheduledAt: r.scheduledAt.toISOString(),
      status: r.status,
      transferredAt: r.transferredAt ? r.transferredAt.toISOString() : null,
      transferredBy: r.transferredBy,
      transferSlipKey: r.transferSlipKey,
      notes: r.notes,
    }));
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

  /**
   * FR-PM-06: preview of the next batch — every released_for_payout intent
   * not yet linked to a Payout, grouped by tutor. Read-only; the admin
   * sanity-checks the queue before calling generateBatch.
   */
  async queue(): Promise<AdminPayoutQueueGroup[]> {
    const intents = await this.prisma.paymentIntent.findMany({
      where: {
        status: "released_for_payout",
        itemType: "booking",
        bookingId: { not: null },
        payoutId: null,
      },
      include: {
        booking: {
          include: { tutor: { include: { user: true } } },
        },
      },
    });

    type Group = AdminPayoutQueueGroup;
    const byTutor = new Map<string, Group>();
    for (const intent of intents) {
      if (!intent.booking) continue;
      const t = intent.booking.tutor;
      const existing = byTutor.get(t.id) ?? {
        tutorId: t.id,
        tutorDisplayName: t.user.displayName,
        // PromptPay number lives on the tutor's user record once tutors fill
        // it in — for now, surface null so the admin manually looks it up.
        tutorPromptPay: null,
        intentIds: [] as string[],
        classCount: 0,
        grossThb: 0,
        commissionThb: 0,
        withholdingTaxThb: 0,
        netThb: 0,
      };
      existing.intentIds.push(intent.id);
      existing.classCount += 1;
      existing.grossThb += intent.amountThb;
      byTutor.set(t.id, existing);
    }

    return [...byTutor.values()].map((g) => {
      const pricing = pricePayout(g.grossThb);
      return {
        ...g,
        commissionThb: pricing.commissionThb,
        withholdingTaxThb: pricing.withholdingTaxThb,
        netThb: pricing.netThb,
      };
    });
  }

  /**
   * FR-PM-06: admin-triggered batch generation. Aggregates every
   * released_for_payout intent into one Payout per tutor. The batchDate
   * (typically the 15th or 30th) is stored as scheduledAt; periodStart /
   * periodEnd cover the open queue window — from the latest prior batch
   * to batchDate.
   */
  async generateBatch(batchDate: Date) {
    const last = await this.prisma.payout.findFirst({
      orderBy: { periodEnd: "desc" },
    });
    const periodStart =
      last?.periodEnd ?? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    return this.computeForPeriod(periodStart, batchDate);
  }

  /**
   * FR-PM-06: admin marks the manual PromptPay transfer to tutor done.
   * Status moves to 'completed', linked intents go to 'paid_out', and the
   * upload proof slip + notes are persisted for the audit trail.
   */
  async markTransferred(
    payoutId: string,
    args: { adminUserId: string; slipObjectKey: string; notes?: string },
  ) {
    const existing = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { intents: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException();
    if (existing.status === "completed") {
      throw new BadRequestException("Payout already marked completed");
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: "completed",
          transferredAt: now,
          transferredBy: args.adminUserId,
          transferSlipKey: args.slipObjectKey,
          notes: args.notes,
          paidAt: now,
        },
      }),
      this.prisma.paymentIntent.updateMany({
        where: { id: { in: existing.intents.map((i) => i.id) } },
        data: { status: "paid_out" },
      }),
    ]);
    return this.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  }

  /**
   * FR-PM-06: admin flags a payout as failed (tutor account closed,
   * incorrect PromptPay number, etc.). Intents stay at released_for_payout
   * so the next batch picks them up again after the issue is resolved;
   * unlink from the failed Payout row.
   */
  async markFailed(payoutId: string, reason: string) {
    const existing = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!existing) throw new NotFoundException();
    if (existing.status === "completed") {
      throw new BadRequestException(
        "Cannot fail a payout that's already completed",
      );
    }
    await this.prisma.$transaction([
      this.prisma.payout.update({
        where: { id: payoutId },
        data: { status: "failed", notes: reason },
      }),
      this.prisma.paymentIntent.updateMany({
        where: { payoutId },
        data: { payoutId: null },
      }),
    ]);
    return this.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  }
}
