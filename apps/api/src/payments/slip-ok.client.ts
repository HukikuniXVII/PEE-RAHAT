import { Injectable, Logger } from "@nestjs/common";

import { StorageService } from "../common/storage.service";

export interface SlipOkVerification {
  success: boolean;
  slipOkRef?: string;
  failureReason?: string;
  amountThb?: number;
}

interface SlipOkConfig {
  apiKey: string;
  branchId: string;
  baseUrl: string;
}

interface SlipOkSuccessBody {
  success: true;
  data: {
    success?: boolean;
    transRef?: string;
    amount?: number;
  };
}

interface SlipOkErrorBody {
  success: false;
  code?: number;
  message?: string;
}

type SlipOkResponseBody = SlipOkSuccessBody | SlipOkErrorBody;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * FR-PM-01: verifies a student's PromptPay transfer slip against the SlipOK
 * Slip Verification API. The slip image is pulled out of the private slips
 * bucket via a short-lived signed URL, base64-encoded, and POSTed to
 * `/api/line/apikey/{branchId}`. SlipOK echoes the amount it parsed off the
 * slip; the caller (PaymentsService) re-checks that against the intent so a
 * tampered SLIPOK_API_KEY can't authorise an underpayment.
 *
 * Dev fallback: if SLIPOK_API_KEY or SLIPOK_BRANCH_ID is unset and
 * NODE_ENV !== 'production', returns a synthetic success so localhost flows
 * keep moving without a real account. Production fails loud.
 */
@Injectable()
export class SlipOkClient {
  private readonly logger = new Logger(SlipOkClient.name);

  constructor(private readonly storage: StorageService) {}

  async verify(
    slipObjectKey: string,
    expectedAmountThb: number,
  ): Promise<SlipOkVerification> {
    const config = this.loadConfig();
    if (!config) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "SLIPOK_API_KEY / SLIPOK_BRANCH_ID not configured — cannot verify slips in production.",
        );
      }
      this.logger.warn(
        "SLIPOK_* env not set — returning stub verification (dev only).",
      );
      return {
        success: true,
        slipOkRef: "dev-stub-ref",
        amountThb: expectedAmountThb,
      };
    }

    let slipBase64: string;
    try {
      slipBase64 = await this.fetchSlipAsBase64(slipObjectKey);
    } catch (err) {
      this.logger.error(`Failed to fetch slip ${slipObjectKey}: ${String(err)}`);
      return { success: false, failureReason: "Could not read slip from storage" };
    }

    const url = `${config.baseUrl}/api/line/apikey/${config.branchId}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-authorization": config.apiKey,
        },
        body: JSON.stringify({
          data: slipBase64,
          amount: expectedAmountThb,
          log: true,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(`SlipOK request failed: ${String(err)}`);
      return { success: false, failureReason: "SlipOK request failed" };
    }

    let body: SlipOkResponseBody;
    try {
      body = (await response.json()) as SlipOkResponseBody;
    } catch (err) {
      this.logger.error(
        `SlipOK returned non-JSON (${response.status}): ${String(err)}`,
      );
      return {
        success: false,
        failureReason: `SlipOK returned non-JSON (${response.status})`,
      };
    }

    if (!response.ok || body.success !== true) {
      const err = body as SlipOkErrorBody;
      const reason = err.message ?? `SlipOK error ${err.code ?? response.status}`;
      this.logger.warn(`SlipOK rejected ${slipObjectKey}: ${reason}`);
      return { success: false, failureReason: reason };
    }

    return {
      success: true,
      slipOkRef: body.data.transRef,
      amountThb: body.data.amount,
    };
  }

  private async fetchSlipAsBase64(slipObjectKey: string): Promise<string> {
    const { url } = await this.storage.signDownload(slipObjectKey);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`storage returned ${res.status}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.toString("base64");
  }

  private loadConfig(): SlipOkConfig | null {
    const apiKey = process.env.SLIPOK_API_KEY;
    const branchId = process.env.SLIPOK_BRANCH_ID;
    if (!apiKey || !branchId) return null;
    return {
      apiKey,
      branchId,
      baseUrl: process.env.SLIPOK_BASE_URL ?? "https://api.slipok.com",
    };
  }
}
