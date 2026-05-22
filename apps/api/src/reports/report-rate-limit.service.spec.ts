import { HttpException } from "@nestjs/common";

import type { PrismaService } from "../prisma/prisma.service";
import { ReportRateLimitService } from "./report-rate-limit.service";

const NOW = new Date("2026-05-22T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const RL_ENV = [
  "REPORT_MAX_PER_24H",
  "REPORT_MAX_PER_30D",
  "REPORT_REREPORT_COOLDOWN_DAYS",
];

interface PrismaParts {
  /** Count results, in call order: [24h window, 30d window]. */
  counts: [number, number];
  /** Result of the single findFirst the call makes (oldest row, or the
   *  prior same-target report). */
  findFirst?: unknown;
}

function makeService(parts: PrismaParts): ReportRateLimitService {
  const prisma = {
    report: {
      count: jest
        .fn()
        .mockResolvedValueOnce(parts.counts[0])
        .mockResolvedValueOnce(parts.counts[1]),
      findFirst: jest.fn().mockResolvedValue(parts.findFirst ?? null),
    },
  };
  return new ReportRateLimitService(prisma as unknown as PrismaService);
}

/** Run `assertCanFile` and return the thrown error (fails if none). */
async function catchThrow(p: Promise<unknown>): Promise<HttpException> {
  try {
    await p;
  } catch (e) {
    return e as HttpException;
  }
  throw new Error("expected assertCanFile to throw");
}

const ARGS = {
  reporterId: "u-reporter",
  targetType: "sheet" as const,
  targetId: "sh1",
  now: NOW,
};

describe("ReportRateLimitService (FR-CM-05 / FR-SM-07 / FR-PM-05)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const k of RL_ENV) delete process.env[k];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("env validation", () => {
    it("defaults to 5 / 20 / 30 when env is unset", () => {
      expect(() => makeService({ counts: [0, 0] })).not.toThrow();
    });

    it("fails fast on a non-integer limit", () => {
      process.env.REPORT_MAX_PER_24H = "5.5";
      expect(() => makeService({ counts: [0, 0] })).toThrow(
        /REPORT_MAX_PER_24H must be a positive integer/,
      );
    });
  });

  it("resolves silently when the reporter is under every limit", async () => {
    const svc = makeService({ counts: [2, 8], findFirst: null });
    await expect(svc.assertCanFile(ARGS)).resolves.toBeUndefined();
  });

  describe("24h volume limit", () => {
    it("throws 429 with the Thai wait message at the limit", async () => {
      const svc = makeService({
        counts: [5, 5],
        // oldest in-window report filed 23h ago → retry in 1h.
        findFirst: { createdAt: new Date(NOW.getTime() - 23 * HOUR) },
      });
      const err = await catchThrow(svc.assertCanFile(ARGS));
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(429);
      expect(err.message).toBe("คุณรายงานบ่อยเกินไป กรุณารอ 1 ชั่วโมง");
    });

    it("respects a REPORT_MAX_PER_24H override", async () => {
      process.env.REPORT_MAX_PER_24H = "2";
      const svc = makeService({
        counts: [2, 2],
        findFirst: { createdAt: new Date(NOW.getTime() - 20 * HOUR) },
      });
      const err = await catchThrow(svc.assertCanFile(ARGS));
      expect(err.getStatus()).toBe(429);
      // retry = filed + 24h = now + 4h.
      expect(err.message).toContain("กรุณารอ 4 ชั่วโมง");
    });
  });

  describe("30d volume limit", () => {
    it("throws 429 when the rolling 30-day count is at the limit", async () => {
      const svc = makeService({
        counts: [1, 20],
        findFirst: { createdAt: new Date(NOW.getTime() - 29 * DAY) },
      });
      const err = await catchThrow(svc.assertCanFile(ARGS));
      expect(err.getStatus()).toBe(429);
      // retry = filed + 30d = now + 24h.
      expect(err.message).toBe("คุณรายงานบ่อยเกินไป กรุณารอ 24 ชั่วโมง");
    });
  });

  describe("re-report cooldown", () => {
    it("blocks re-reporting the same target when the prior report is not escalated", async () => {
      const svc = makeService({
        counts: [1, 3],
        findFirst: {
          createdAt: new Date(NOW.getTime() - 20 * DAY),
          status: "pending",
        },
      });
      const err = await catchThrow(svc.assertCanFile(ARGS));
      expect(err.getStatus()).toBe(429);
      // retry = filed + 30d cooldown = now + 10d = 240h.
      expect(err.message).toBe("คุณรายงานบ่อยเกินไป กรุณารอ 240 ชั่วโมง");
    });

    it("allows re-reporting when the prior report escalated", async () => {
      const svc = makeService({
        counts: [1, 3],
        findFirst: {
          createdAt: new Date(NOW.getTime() - 20 * DAY),
          status: "escalated",
        },
      });
      await expect(svc.assertCanFile(ARGS)).resolves.toBeUndefined();
    });

    it("allows a new report when no prior report sits inside the cooldown", async () => {
      // findFirst filters by createdAt — an old report returns null here.
      const svc = makeService({ counts: [1, 3], findFirst: null });
      await expect(svc.assertCanFile(ARGS)).resolves.toBeUndefined();
    });
  });
});
