import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { readPositiveInt } from "../common/env";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Anti-abuse rate limits for filing bug reports:
 *   - at most BUG_REPORT_MAX_PER_HOUR per reporter per rolling hour
 *   - at most BUG_REPORT_MAX_PER_DAY  per reporter per rolling day
 *
 * Authenticated reporters are counted from the BugReport table by
 * reporterId. Anonymous reporters have no row to count (and the schema
 * stores no IP), so they're tracked in an in-memory sliding window keyed
 * by IP — adequate for the single-instance VPS deployment. A violation
 * throws 429 with a Thai message.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function tooManyBugs(): HttpException {
  return new HttpException(
    "คุณแจ้งบั๊กบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

@Injectable()
export class BugReportRateLimitService {
  private readonly maxPerHour: number;
  private readonly maxPerDay: number;
  /** ip → ascending list of submit timestamps (ms), pruned on each call. */
  private readonly anonHits = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {
    this.maxPerHour = readPositiveInt("BUG_REPORT_MAX_PER_HOUR", 5);
    this.maxPerDay = readPositiveInt("BUG_REPORT_MAX_PER_DAY", 20);
  }

  /**
   * Throw 429 when the reporter is over either window. Resolves silently
   * when clear. For anonymous reporters this also records the attempt
   * (consuming a slot), since there's no DB row to count later.
   */
  async assertCanFile(args: {
    reporterId: string | null;
    ip: string;
    now?: Date;
  }): Promise<void> {
    const now = (args.now ?? new Date()).getTime();

    if (args.reporterId) {
      const [perHour, perDay] = await Promise.all([
        this.prisma.bugReport.count({
          where: {
            reporterId: args.reporterId,
            createdAt: { gte: new Date(now - HOUR_MS) },
          },
        }),
        this.prisma.bugReport.count({
          where: {
            reporterId: args.reporterId,
            createdAt: { gte: new Date(now - DAY_MS) },
          },
        }),
      ]);
      if (perHour >= this.maxPerHour || perDay >= this.maxPerDay) {
        throw tooManyBugs();
      }
      return;
    }

    // Anonymous — in-memory IP window.
    const key = args.ip || "unknown";
    const recent = (this.anonHits.get(key) ?? []).filter(
      (t) => t > now - DAY_MS,
    );
    const inHour = recent.filter((t) => t > now - HOUR_MS).length;
    if (inHour >= this.maxPerHour || recent.length >= this.maxPerDay) {
      this.anonHits.set(key, recent); // persist the prune
      throw tooManyBugs();
    }
    recent.push(now);
    this.anonHits.set(key, recent);
    this.pruneAnonMap(now);
  }

  /** Keep the anon map bounded — drop IPs with no hits in the last day. */
  private pruneAnonMap(now: number): void {
    if (this.anonHits.size < 5000) return;
    for (const [ip, hits] of this.anonHits) {
      const live = hits.filter((t) => t > now - DAY_MS);
      if (live.length === 0) this.anonHits.delete(ip);
      else this.anonHits.set(ip, live);
    }
  }
}
