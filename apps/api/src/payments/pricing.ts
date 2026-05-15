// FR-PM-04 / FR-PM-07: payout math.
//
// Tiered commission was dropped in the 2026-05-15 manual-payments refactor
// (see requirements.md §4.5). The platform takes a flat percentage from
// every payout, tunable via env without a deploy.
//
//   commission     = grossThb * PLATFORM_COMMISSION_PCT / 100
//   withholdingTax = (grossThb - commission) * WITHHOLDING_TAX_PCT / 100
//   net            = grossThb - commission - withholdingTax
//
// Withholding tax is computed on the post-commission amount because that's
// what the tutor actually earns under Thai tax law (the platform's cut is
// the platform's revenue, not the tutor's).

const DEFAULT_COMMISSION_PCT = 10;
const DEFAULT_WITHHOLDING_PCT = 3;

export interface PayoutPricing {
  grossThb: number;
  commissionThb: number;
  withholdingTaxThb: number;
  netThb: number;
}

function readPct(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n >= 100) {
    throw new Error(
      `${envKey} must be a non-negative number below 100, got: ${raw}`,
    );
  }
  return n;
}

export function commissionPct(): number {
  return readPct("PLATFORM_COMMISSION_PCT", DEFAULT_COMMISSION_PCT);
}

export function withholdingTaxPct(): number {
  return readPct("WITHHOLDING_TAX_PCT", DEFAULT_WITHHOLDING_PCT);
}

export function pricePayout(grossThb: number): PayoutPricing {
  if (!Number.isInteger(grossThb) || grossThb < 0) {
    throw new Error("grossThb must be a non-negative integer");
  }
  const commission = commissionPct();
  const withholding = withholdingTaxPct();
  if (commission + withholding >= 100) {
    throw new Error(
      `PLATFORM_COMMISSION_PCT + WITHHOLDING_TAX_PCT must sum to less than 100 (got ${commission} + ${withholding})`,
    );
  }
  const commissionThb = Math.round((grossThb * commission) / 100);
  const afterCommission = grossThb - commissionThb;
  const withholdingTaxThb = Math.round((afterCommission * withholding) / 100);
  const netThb = afterCommission - withholdingTaxThb;
  return { grossThb, commissionThb, withholdingTaxThb, netThb };
}
