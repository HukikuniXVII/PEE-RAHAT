// EMVCo-compliant PromptPay QR payload encoder.
//
// References:
//   - EMVCo Merchant-Presented QR Code Specification v1.1
//   - Bank of Thailand PromptPay AID: A000000677010111
//
// Tag layout (all values are ASCII strings; lengths are 2-digit decimal
// counts of the value's character length):
//
//   00  Payload Format Indicator              "01"
//   01  Point of Initiation Method            "11" static / "12" dynamic
//   29  Merchant Account Information (PromptPay)
//        00 AID                               "A000000677010111"
//        01 Merchant ID                       phone / NID / e-wallet
//   53  Currency Code (ISO 4217 numeric)      "764" THB
//   54  Transaction Amount                    "350.00"
//   58  Country Code                          "TH"
//   63  CRC-16/CCITT-FALSE of everything before this tag, including
//        the literal "6304" prefix.

const PROMPTPAY_AID = "A000000677010111";

function tlv(tag: string, value: string): string {
  if (value.length > 99) {
    throw new Error(`TLV value too long for tag ${tag}: ${value.length} chars`);
  }
  return tag + value.length.toString().padStart(2, "0") + value;
}

/**
 * CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, no xorout.
 * Standard EMVCo / PromptPay choice.
 */
function crc16ccittFalse(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Normalize a raw merchant identifier for tag 29 sub-tag 01.
 *  - 10-digit Thai mobile (e.g. 0812345678) → "0066812345678"
 *  - 13-digit National ID                    → unchanged
 *  - 15-digit e-wallet ID                    → unchanged
 *
 * Already-prefixed mobile (13 chars starting with "0066") is also accepted
 * verbatim. Anything else throws — better to crash at boot than to ship a
 * QR no app can scan.
 */
export function formatMerchantId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return "0066" + digits.slice(1);
  }
  if (digits.length === 13 && digits.startsWith("0066")) {
    return digits;
  }
  if (digits.length === 13) {
    return digits; // National ID
  }
  if (digits.length === 15) {
    return digits; // e-Wallet ID
  }
  throw new Error(
    `Invalid PromptPay merchant id: expected 10-digit mobile, 13-digit NID, or 15-digit wallet, got ${digits.length} digits`,
  );
}

function formatAmount(amountThb: number): string {
  if (!Number.isFinite(amountThb) || amountThb < 0) {
    throw new Error(`Invalid PromptPay amount: ${amountThb}`);
  }
  return amountThb.toFixed(2);
}

export interface PromptPayInput {
  merchantId: string;
  amountThb: number;
}

export function encodePromptPayPayload(input: PromptPayInput): string {
  const merchantInfo =
    tlv("00", PROMPTPAY_AID) + tlv("01", formatMerchantId(input.merchantId));
  const head =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("29", merchantInfo) +
    tlv("53", "764") +
    tlv("54", formatAmount(input.amountThb)) +
    tlv("58", "TH") +
    "6304";
  return head + crc16ccittFalse(head);
}

// ─── Round-trip parser ────────────────────────────────────────────────────
// Used by tests / verification scripts. Not consumed by the runtime path,
// but the encoder is too easy to silently break — keeping the inverse in
// the same file means any drift shows up immediately.

export interface ParsedPromptPay {
  merchantId: string;
  amountThb: number;
  currency: string;
  country: string;
  crcOk: boolean;
}

export function parsePromptPayPayload(payload: string): ParsedPromptPay {
  const tags: Record<string, string> = {};
  let i = 0;
  while (i < payload.length - 4) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    const value = payload.slice(i + 4, i + 4 + len);
    tags[tag] = value;
    i += 4 + len;
    if (tag === "63") break;
  }

  const merchantInfo = tags["29"] ?? "";
  const innerTags: Record<string, string> = {};
  let j = 0;
  while (j < merchantInfo.length) {
    const tag = merchantInfo.slice(j, j + 2);
    const len = parseInt(merchantInfo.slice(j + 2, j + 4), 10);
    innerTags[tag] = merchantInfo.slice(j + 4, j + 4 + len);
    j += 4 + len;
  }

  const givenCrc = tags["63"];
  const headLength = payload.length - 4;
  const recomputed = crc16ccittFalse(payload.slice(0, headLength));

  return {
    merchantId: innerTags["01"] ?? "",
    amountThb: parseFloat(tags["54"] ?? "0"),
    currency: tags["53"] ?? "",
    country: tags["58"] ?? "",
    crcOk: givenCrc === recomputed,
  };
}
