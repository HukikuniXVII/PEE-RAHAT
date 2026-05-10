// Phase 1 payout pricing. FR-PM-04 tiered commission is Phase 2 per §11,
// so commission stays flat at 20%. FR-PM-07 withholding is fixed by Thai
// tax law at 3% of the post-commission amount.
export const PHASE_1_COMMISSION_PCT = 20;
export const WITHHOLDING_TAX_PCT = 3;

export interface PayoutPricing {
  grossThb: number;
  commissionThb: number;
  withholdingTaxThb: number;
  netThb: number;
}

export function pricePayout(grossThb: number): PayoutPricing {
  const commissionThb = Math.round((grossThb * PHASE_1_COMMISSION_PCT) / 100);
  const afterCommission = grossThb - commissionThb;
  const withholdingTaxThb = Math.round((afterCommission * WITHHOLDING_TAX_PCT) / 100);
  const netThb = afterCommission - withholdingTaxThb;
  return { grossThb, commissionThb, withholdingTaxThb, netThb };
}
