import { RefundPolicyService } from "./refund-policy.service";

describe("RefundPolicyService (FR-TH-11)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.POSTPONE_TUTOR_CUT_SHORT_NOTICE;
    delete process.env.POSTPONE_PLATFORM_FEE_SHORT_NOTICE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("env validation", () => {
    it("uses defaults 50/10 when env vars are unset", () => {
      const svc = new RefundPolicyService();
      const split = svc.computeSplit({
        initiator: "student",
        wasShortNotice: true,
        outcome: "no_agreement",
        amountThb: 1000,
      });
      expect(split).toEqual({
        tutorThb: 500,
        platformThb: 100,
        studentRefundThb: 400,
      });
    });

    it("respects env override 60/15", () => {
      process.env.POSTPONE_TUTOR_CUT_SHORT_NOTICE = "60";
      process.env.POSTPONE_PLATFORM_FEE_SHORT_NOTICE = "15";
      const svc = new RefundPolicyService();
      const split = svc.computeSplit({
        initiator: "student",
        wasShortNotice: true,
        outcome: "no_agreement",
        amountThb: 1000,
      });
      expect(split).toEqual({
        tutorThb: 600,
        platformThb: 150,
        studentRefundThb: 250,
      });
    });

    it("fails fast when tutor+platform > 100", () => {
      process.env.POSTPONE_TUTOR_CUT_SHORT_NOTICE = "70";
      process.env.POSTPONE_PLATFORM_FEE_SHORT_NOTICE = "40";
      expect(() => new RefundPolicyService()).toThrow(/exceeds 100%/);
    });

    it("fails fast on non-numeric env", () => {
      process.env.POSTPONE_TUTOR_CUT_SHORT_NOTICE = "fifty";
      expect(() => new RefundPolicyService()).toThrow(/must be a number/);
    });

    it("fails fast on negative percentage", () => {
      process.env.POSTPONE_TUTOR_CUT_SHORT_NOTICE = "-5";
      expect(() => new RefundPolicyService()).toThrow(/must be a number/);
    });
  });

  describe("case A — student short-notice no_agreement", () => {
    it("returns 50/10/40 split on 1000 THB", () => {
      const svc = new RefundPolicyService();
      expect(
        svc.computeSplit({
          initiator: "student",
          wasShortNotice: true,
          outcome: "no_agreement",
          amountThb: 1000,
        }),
      ).toEqual({ tutorThb: 500, platformThb: 100, studentRefundThb: 400 });
    });

    it("rounds correctly on odd amounts (1499 THB)", () => {
      const svc = new RefundPolicyService();
      const split = svc.computeSplit({
        initiator: "student",
        wasShortNotice: true,
        outcome: "no_agreement",
        amountThb: 1499,
      });
      // 50% of 1499 = 749.5 → 750. 10% = 149.9 → 150. Refund = 1499 - 750 - 150 = 599.
      expect(split).toEqual({
        tutorThb: 750,
        platformThb: 150,
        studentRefundThb: 599,
      });
      expect(split.tutorThb + split.platformThb + split.studentRefundThb).toBe(
        1499,
      );
    });
  });

  describe("case B — tutor unresponsive", () => {
    it("returns 100% student refund", () => {
      const svc = new RefundPolicyService();
      expect(
        svc.computeSplit({
          initiator: "student",
          wasShortNotice: false,
          outcome: "unresponsive",
          amountThb: 1000,
        }),
      ).toEqual({ tutorThb: 0, platformThb: 0, studentRefundThb: 1000 });
    });
  });

  describe("case C — tutor-initiated no_agreement", () => {
    it("returns 100% student refund regardless of notice window", () => {
      const svc = new RefundPolicyService();
      for (const wasShortNotice of [true, false]) {
        expect(
          svc.computeSplit({
            initiator: "tutor",
            wasShortNotice,
            outcome: "tutor_initiated_no_agreement",
            amountThb: 800,
          }),
        ).toEqual({ tutorThb: 0, platformThb: 0, studentRefundThb: 800 });
      }
    });
  });

  describe("case D — agreed", () => {
    it("returns full tutor portion, no refund", () => {
      const svc = new RefundPolicyService();
      expect(
        svc.computeSplit({
          initiator: "student",
          wasShortNotice: true,
          outcome: "agreed",
          amountThb: 1200,
        }),
      ).toEqual({ tutorThb: 1200, platformThb: 0, studentRefundThb: 0 });
    });
  });

  describe("defensive fallback", () => {
    it("treats student-initiated no_agreement at >12h as full refund (worker should reclassify as unresponsive)", () => {
      const svc = new RefundPolicyService();
      expect(
        svc.computeSplit({
          initiator: "student",
          wasShortNotice: false,
          outcome: "no_agreement",
          amountThb: 500,
        }),
      ).toEqual({ tutorThb: 0, platformThb: 0, studentRefundThb: 500 });
    });

    it("rejects negative amountThb", () => {
      const svc = new RefundPolicyService();
      expect(() =>
        svc.computeSplit({
          initiator: "student",
          wasShortNotice: true,
          outcome: "no_agreement",
          amountThb: -1,
        }),
      ).toThrow(/non-negative integer/);
    });
  });
});
