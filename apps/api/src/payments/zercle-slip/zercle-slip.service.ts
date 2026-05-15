import { Injectable, Logger } from "@nestjs/common";

import { StorageService } from "../../common/storage.service";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  ZercleSlipApiResponse,
  ZercleVerifyArgs,
  ZercleVerifyOutcome,
} from "./zercle-slip.types";

const REQUEST_TIMEOUT_MS = 10_000;
const STALE_HOURS = 24;

/**
 * FR-PM-02: verifies a student's PromptPay transfer slip against the
 * ZercleSlip API. Replaces SlipOK after the 2026-05-15 manual-payments
 * pivot; the API contract is the single integration point the platform
 * has for auto-verifying slips before they land in escrow.
 *
 * Business rules applied on top of whatever the API returns:
 *  - amount must exactly match the intent's amountThb (no tolerance)
 *  - recipient.accountNumber must match ZERCLE_PLATFORM_ACCOUNT_NUMBER
 *  - transactionId must be globally unique (no duplicate slip → two paid
 *    bookings); enforced both by the DB index and by an explicit lookup
 *    so the failure message can be human-readable
 *  - transferDate (if returned) must be within the last 24 hours
 *
 * Disabled mode (`ZERCLE_SLIP_ENABLED=false`, the default): every slip is
 * shunted to the admin manual-review queue. Lets the platform ship before
 * the ZercleSlip account is provisioned.
 *
 * TODO(zercleslip-docs): wire `callApi` to the real ZercleSlip endpoint
 * + auth header once docs land. The current stub returns ok with stub
 * fields so dev flows keep moving.
 */
@Injectable()
export class ZercleSlipService {
  private readonly logger = new Logger(ZercleSlipService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  isEnabled(): boolean {
    return process.env.ZERCLE_SLIP_ENABLED === "true";
  }

  async verify({
    slipObjectKey,
    expectedAmountThb,
  }: ZercleVerifyArgs): Promise<ZercleVerifyOutcome> {
    if (!this.isEnabled()) {
      this.logger.log(
        "ZERCLE_SLIP_ENABLED=false — routing slip to admin manual-review queue",
      );
      return {
        ok: false,
        reason:
          "ZercleSlip integration is disabled — slip routed to admin manual review",
        raw: null,
      };
    }

    let slipBase64: string;
    try {
      slipBase64 = await this.fetchSlipAsBase64(slipObjectKey);
    } catch (err) {
      this.logger.error(`Failed to fetch slip ${slipObjectKey}: ${String(err)}`);
      return {
        ok: false,
        reason: "Could not read slip from storage",
        raw: null,
      };
    }

    let raw: ZercleSlipApiResponse;
    try {
      raw = await this.callApi(slipBase64);
    } catch (err) {
      this.logger.error(`ZercleSlip request failed: ${String(err)}`);
      return {
        ok: false,
        reason: "ZercleSlip request failed",
        raw: null,
      };
    }

    if (!raw.success) {
      return {
        ok: false,
        reason: raw.failureReason ?? "ZercleSlip rejected the slip",
        raw,
      };
    }

    if (raw.amount !== expectedAmountThb) {
      return {
        ok: false,
        reason: `Amount mismatch: slip ฿${raw.amount} vs expected ฿${expectedAmountThb}`,
        raw,
      };
    }

    const platformAccount = process.env.ZERCLE_PLATFORM_ACCOUNT_NUMBER;
    if (
      platformAccount &&
      raw.recipient?.accountNumber &&
      raw.recipient.accountNumber !== platformAccount
    ) {
      return {
        ok: false,
        reason: `Recipient mismatch: slip sent to ${raw.recipient.accountNumber}, expected ${platformAccount}`,
        raw,
      };
    }

    if (!raw.transactionId) {
      return {
        ok: false,
        reason: "ZercleSlip returned no transactionId — cannot dedupe",
        raw,
      };
    }

    if (raw.transferDate) {
      const ageMs = Date.now() - new Date(raw.transferDate).getTime();
      if (Number.isFinite(ageMs) && ageMs > STALE_HOURS * 60 * 60_000) {
        return {
          ok: false,
          reason: `Slip is older than ${STALE_HOURS}h (transferDate ${raw.transferDate})`,
          raw,
        };
      }
    }

    const seen = await this.prisma.paymentIntent.findFirst({
      where: { transactionId: raw.transactionId },
      select: { id: true },
    });
    if (seen) {
      return {
        ok: false,
        reason: `Duplicate slip — transactionId ${raw.transactionId} already used`,
        duplicate: true,
        raw,
      };
    }

    return {
      ok: true,
      transactionId: raw.transactionId,
      amountThb: raw.amount,
      raw,
    };
  }

  /**
   * Stub. Real impl pending ZercleSlip docs (endpoint URL, auth header
   * shape, request body schema). When wiring, mirror the SlipOK pattern:
   * timeout via AbortSignal.timeout, JSON content-type, auth via header.
   */
  private async callApi(_slipBase64: string): Promise<ZercleSlipApiResponse> {
    const apiKey = process.env.ZERCLE_SLIP_API_KEY;
    const apiUrl = process.env.ZERCLE_SLIP_API_URL;
    if (!apiKey || !apiUrl) {
      throw new Error(
        "ZercleSlip enabled but ZERCLE_SLIP_API_KEY / ZERCLE_SLIP_API_URL not set",
      );
    }
    // TODO(zercleslip-docs): replace this stub with the real call once the
    // ZercleSlip docs are available. Tests mock callApi directly via the
    // service's `verify` boundary so wiring this up later is a drop-in.
    throw new Error(
      "ZercleSlip HTTP client not yet implemented — awaiting integration docs",
    );
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
}
