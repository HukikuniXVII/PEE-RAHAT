import { commissionPct, pricePayout, withholdingTaxPct } from "./pricing";

describe("pricing (FR-PM-04 / FR-PM-07)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PLATFORM_COMMISSION_PCT;
    delete process.env.WITHHOLDING_TAX_PCT;
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  describe("defaults", () => {
    it("uses 10% commission and 3% withholding when env unset", () => {
      expect(commissionPct()).toBe(10);
      expect(withholdingTaxPct()).toBe(3);
    });

    it("400 THB gross → 40 commission, 11 WHT, 349 net", () => {
      // 10% of 400 = 40. (400 - 40) = 360. 3% of 360 = 10.8 → 11. Net = 349.
      expect(pricePayout(400)).toEqual({
        grossThb: 400,
        commissionThb: 40,
        withholdingTaxThb: 11,
        netThb: 349,
      });
    });

    it("sum invariant: commission + WHT + net = gross", () => {
      for (const gross of [100, 250, 499, 1000, 1499, 2500]) {
        const p = pricePayout(gross);
        expect(p.commissionThb + p.withholdingTaxThb + p.netThb).toBe(gross);
      }
    });
  });

  describe("env overrides", () => {
    it("respects PLATFORM_COMMISSION_PCT", () => {
      process.env.PLATFORM_COMMISSION_PCT = "15";
      expect(pricePayout(1000)).toEqual({
        grossThb: 1000,
        commissionThb: 150,
        withholdingTaxThb: 26, // 3% of 850 = 25.5 → 26
        netThb: 824,
      });
    });

    it("respects WITHHOLDING_TAX_PCT=0 (no withholding)", () => {
      process.env.WITHHOLDING_TAX_PCT = "0";
      expect(pricePayout(1000)).toEqual({
        grossThb: 1000,
        commissionThb: 100,
        withholdingTaxThb: 0,
        netThb: 900,
      });
    });
  });

  describe("validation", () => {
    it("rejects negative commission env", () => {
      process.env.PLATFORM_COMMISSION_PCT = "-1";
      expect(() => pricePayout(100)).toThrow(
        /PLATFORM_COMMISSION_PCT must be a non-negative number/,
      );
    });

    it("rejects commission >= 100", () => {
      process.env.PLATFORM_COMMISSION_PCT = "100";
      expect(() => pricePayout(100)).toThrow(/below 100/);
    });

    it("rejects non-numeric env", () => {
      process.env.WITHHOLDING_TAX_PCT = "three";
      expect(() => pricePayout(100)).toThrow(
        /WITHHOLDING_TAX_PCT must be a non-negative number/,
      );
    });

    it("rejects commission + WHT >= 100", () => {
      process.env.PLATFORM_COMMISSION_PCT = "60";
      process.env.WITHHOLDING_TAX_PCT = "40";
      expect(() => pricePayout(100)).toThrow(/must sum to less than 100/);
    });

    it("rejects negative or fractional grossThb", () => {
      expect(() => pricePayout(-1)).toThrow(/non-negative integer/);
      expect(() => pricePayout(1.5)).toThrow(/non-negative integer/);
    });
  });
});
