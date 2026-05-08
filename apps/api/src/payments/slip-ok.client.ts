import { Injectable } from "@nestjs/common";

export interface SlipOkVerification {
  success: boolean;
  slipOkRef?: string;
  failureReason?: string;
  amountThb?: number;
}

@Injectable()
export class SlipOkClient {
  /**
   * FR-PM-01: SlipOK verification.
   * TODO: replace stub with real https://slipok.com integration once API key is provisioned.
   */
  async verify(_slipObjectKey: string, _expectedAmountThb: number): Promise<SlipOkVerification> {
    if (!process.env.SLIPOK_API_KEY) {
      return {
        success: false,
        failureReason: "SLIPOK_API_KEY not configured",
      };
    }
    // Real impl: POST slip image bytes (or URL) + expectedAmount to SlipOK; parse response.
    return { success: true, slipOkRef: "stub-ref", amountThb: _expectedAmountThb };
  }
}
