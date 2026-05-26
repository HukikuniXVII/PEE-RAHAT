import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { ReportTarget } from "@peerahat/types";

import { readPositiveInt } from "../common/env";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Anti-abuse rate limits for filing reports (FR-CM-05 / FR-SM-07 /
 * FR-PM-05). Enforced by ReportsService.create:
 *   - at most REPORT_MAX_PER_24H reports per reporter per rolling 24h
 *   - at most REPORT_MAX_PER_30D reports per reporter per rolling 30d
 *   - no re-report of the same (targetType, targetId) within
 *     REPORT_REREPORT_COOLDOWN_DAYS, unless the prior report escalated
 *
 * A violation throws 429 with a Thai message naming the wait time.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Whole hours from `now` until `retryAt`, never below 1. */
function hoursUntil(retryAt: number, now: number): number {
  return Math.max(1, Math.ceil((retryAt - now) / HOUR_MS));
}

/** 429 with the Thai "you're reporting too often" copy. */
function tooManyReports(hours: number): HttpException {
  return new HttpException(
    `คุณรายงานบ่อยเกินไป กรุณารอ ${hours} ชั่วโมง`,
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export interface RateLimitCheckArgs {
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  /** Defaults to `new Date()`; injectable for deterministic tests. */
  now?: Date;
}

@Injectable()
export class ReportRateLimitService {
  private readonly maxPer24h: number;
  private readonly maxPer30d: number;
  private readonly rereportCooldownDays: number;

  constructor(private readonly prisma: PrismaService) {
    this.maxPer24h = readPositiveInt("REPORT_MAX_PER_24H", 5);
    this.maxPer30d = readPositiveInt("REPORT_MAX_PER_30D", 20);
    this.rereportCooldownDays = readPositiveInt(
      "REPORT_REREPORT_COOLDOWN_DAYS",
      30,
    );
  }

  /**
   * Throw 429 when the reporter is over a volume limit or is re-reporting
   * the same target inside the cooldown. Resolves silently when clear.
   */
  async assertCanFile(args: RateLimitCheckArgs): Promise<void> {
    const now = (args.now ?? new Date()).getTime();
    const since24h = new Date(now - DAY_MS);
    const since30d = new Date(now - 30 * DAY_MS);

    const [count24h, count30d] = await Promise.all([
      this.prisma.report.count({
        where: { reporterId: args.reporterId, createdAt: { gte: since24h } },
      }),
      this.prisma.report.count({
        where: { reporterId: args.reporterId, createdAt: { gte: since30d } },
      }),
    ]);

    if (count24h >= this.maxPer24h) {
      const oldest = await this.prisma.report.findFirst({
        where: { reporterId: args.reporterId, createdAt: { gte: since24h } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      const retryAt = oldest ? oldest.createdAt.getTime() + DAY_MS : now;
      throw tooManyReports(hoursUntil(retryAt, now));
    }

    if (count30d >= this.maxPer30d) {
      const oldest = await this.prisma.report.findFirst({
        where: { reporterId: args.reporterId, createdAt: { gte: since30d } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      const retryAt = oldest ? oldest.createdAt.getTime() + 30 * DAY_MS : now;
      throw tooManyReports(hoursUntil(retryAt, now));
    }

    // Re-report cooldown: a reporter can't file again on the same target
    // within the window unless their prior report was escalated.
    const cooldownStart = new Date(now - this.rereportCooldownDays * DAY_MS);
    const prior = await this.prisma.report.findFirst({
      where: {
        reporterId: args.reporterId,
        targetType: args.targetType,
        targetId: args.targetId,
        createdAt: { gte: cooldownStart },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    });
    if (prior && prior.status !== "escalated") {
      const retryAt =
        prior.createdAt.getTime() + this.rereportCooldownDays * DAY_MS;
      throw tooManyReports(hoursUntil(retryAt, now));
    }
  }
}
