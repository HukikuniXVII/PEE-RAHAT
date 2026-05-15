/**
 * Shape of the ZercleSlip /verify response — populated from the docs once
 * they land. Until then, the fields below match what the verify business
 * rules need: success flag, parsed amount, recipient, transaction id for
 * dedupe, and a transferDate to bound staleness.
 *
 * Anything we don't yet model is carried opaquely on `raw` so the full
 * payload still lands in PaymentIntent.zercleResponse for admin review.
 */
export interface ZercleSlipApiResponse {
  success: boolean;
  amount?: number;
  sender?: {
    name?: string;
    accountNumber?: string;
    bank?: string;
  };
  recipient?: {
    name?: string;
    accountNumber?: string;
    bank?: string;
  };
  transferDate?: string;
  transactionId?: string;
  failureReason?: string;
}

export type ZercleVerifyOutcome =
  | {
      ok: true;
      transactionId: string;
      amountThb: number;
      raw: ZercleSlipApiResponse;
    }
  | {
      ok: false;
      reason: string;
      /** Set when the failure was a duplicate slip — admin sees a flag. */
      duplicate?: boolean;
      raw: ZercleSlipApiResponse | null;
    };

export interface ZercleVerifyArgs {
  slipObjectKey: string;
  expectedAmountThb: number;
}
