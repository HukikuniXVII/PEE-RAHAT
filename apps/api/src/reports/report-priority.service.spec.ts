import type { ReportCategory } from "@peerahat/types";

import type { ComputePriorityInput } from "./report-priority.service";
import { ReportPriorityService } from "./report-priority.service";

const NOW = new Date("2026-05-22T00:00:00.000Z");
const HOUR = 60 * 60 * 1000;

const SLA_ENV = [
  "REPORT_SLA_URGENT_HOURS",
  "REPORT_SLA_HIGH_HOURS",
  "REPORT_SLA_NORMAL_HOURS",
  "REPORT_SLA_LOW_HOURS",
];

/** Build a full priority input from a small set of overrides. */
function makeInput(parts: {
  category?: ReportCategory;
  falseReportCount?: number;
  isMinor?: boolean;
  target?: ComputePriorityInput["target"];
}): ComputePriorityInput {
  return {
    reporter: {
      falseReportCount: parts.falseReportCount ?? 0,
      isMinor: parts.isMinor ?? false,
    },
    category: parts.category ?? "spam",
    target: parts.target ?? { type: "community_post" },
    now: NOW,
  };
}

describe("ReportPriorityService (FR-CM-05 / FR-SM-07 / FR-PM-05)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const k of SLA_ENV) delete process.env[k];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("SLA env validation", () => {
    it("uses defaults 4/12/48/72 when env is unset", () => {
      const svc = new ReportPriorityService();
      expect(
        svc.compute(makeInput({ category: "scam" })).slaDeadline,
      ).toEqual(new Date(NOW.getTime() + 4 * HOUR));
      expect(
        svc.compute(makeInput({ falseReportCount: 3 })).slaDeadline,
      ).toEqual(new Date(NOW.getTime() + 72 * HOUR));
    });

    it("respects an env override", () => {
      process.env.REPORT_SLA_URGENT_HOURS = "2";
      const svc = new ReportPriorityService();
      expect(
        svc.compute(makeInput({ category: "fraud" })).slaDeadline,
      ).toEqual(new Date(NOW.getTime() + 2 * HOUR));
    });

    it("fails fast on a non-numeric env value", () => {
      process.env.REPORT_SLA_HIGH_HOURS = "soon";
      expect(() => new ReportPriorityService()).toThrow(
        /REPORT_SLA_HIGH_HOURS must be a positive number/,
      );
    });

    it("fails fast on a zero or negative env value", () => {
      process.env.REPORT_SLA_NORMAL_HOURS = "0";
      expect(() => new ReportPriorityService()).toThrow(/positive number/);
    });
  });

  describe("urgent — sensitive categories", () => {
    it.each<ReportCategory>(["scam", "fraud", "payment_issue"])(
      "%s → urgent / 4h",
      (category) => {
        const svc = new ReportPriorityService();
        const result = svc.compute(makeInput({ category }));
        expect(result.priority).toBe("urgent");
        expect(result.slaDeadline).toEqual(new Date(NOW.getTime() + 4 * HOUR));
      },
    );
  });

  describe("urgent — minor reporting abuse/harassment", () => {
    it.each<ReportCategory>(["abuse", "harassment"])(
      "%s by a reporter under 18 → urgent",
      (category) => {
        const svc = new ReportPriorityService();
        expect(
          svc.compute(makeInput({ category, isMinor: true })).priority,
        ).toBe("urgent");
      },
    );

    it("abuse by an adult reporter is not urgent", () => {
      const svc = new ReportPriorityService();
      expect(
        svc.compute(makeInput({ category: "abuse", isMinor: false })).priority,
      ).toBe("normal");
    });
  });

  describe("high — imminent paid booking", () => {
    it("paid booking scheduled within 24h → high / 12h", () => {
      const svc = new ReportPriorityService();
      const result = svc.compute(
        makeInput({
          category: "no_show",
          target: {
            type: "booking",
            bookingStatus: "paid",
            bookingScheduledAt: new Date(NOW.getTime() + 12 * HOUR),
          },
        }),
      );
      expect(result.priority).toBe("high");
      expect(result.slaDeadline).toEqual(new Date(NOW.getTime() + 12 * HOUR));
    });

    it("paid booking more than 24h away → normal", () => {
      const svc = new ReportPriorityService();
      expect(
        svc.compute(
          makeInput({
            category: "no_show",
            target: {
              type: "booking",
              bookingStatus: "paid",
              bookingScheduledAt: new Date(NOW.getTime() + 48 * HOUR),
            },
          }),
        ).priority,
      ).toBe("normal");
    });

    it("the 24h window is exclusive at the boundary", () => {
      const svc = new ReportPriorityService();
      expect(
        svc.compute(
          makeInput({
            category: "no_show",
            target: {
              type: "booking",
              bookingStatus: "paid",
              bookingScheduledAt: new Date(NOW.getTime() + 24 * HOUR),
            },
          }),
        ).priority,
      ).toBe("normal");
    });

    it("an imminent booking that is not yet paid → normal", () => {
      const svc = new ReportPriorityService();
      expect(
        svc.compute(
          makeInput({
            category: "no_show",
            target: {
              type: "booking",
              bookingStatus: "accepted",
              bookingScheduledAt: new Date(NOW.getTime() + HOUR),
            },
          }),
        ).priority,
      ).toBe("normal");
    });
  });

  describe("low — serial false-reporter downgrade", () => {
    it("falseReportCount ≥ 3 downgrades to low / 72h, overriding urgency", () => {
      const svc = new ReportPriorityService();
      const result = svc.compute(
        makeInput({ category: "scam", falseReportCount: 3 }),
      );
      expect(result.priority).toBe("low");
      expect(result.slaDeadline).toEqual(new Date(NOW.getTime() + 72 * HOUR));
    });

    it("downgrades an otherwise-high imminent-booking report", () => {
      const svc = new ReportPriorityService();
      expect(
        svc.compute(
          makeInput({
            category: "no_show",
            falseReportCount: 5,
            target: {
              type: "booking",
              bookingStatus: "paid",
              bookingScheduledAt: new Date(NOW.getTime() + HOUR),
            },
          }),
        ).priority,
      ).toBe("low");
    });

    it("falseReportCount of 2 is below the threshold", () => {
      const svc = new ReportPriorityService();
      expect(
        svc.compute(makeInput({ category: "scam", falseReportCount: 2 }))
          .priority,
      ).toBe("urgent");
    });
  });

  describe("normal — default", () => {
    it("an ordinary report → normal / 48h", () => {
      const svc = new ReportPriorityService();
      const result = svc.compute(makeInput({ category: "spam" }));
      expect(result.priority).toBe("normal");
      expect(result.slaDeadline).toEqual(new Date(NOW.getTime() + 48 * HOUR));
    });
  });
});
