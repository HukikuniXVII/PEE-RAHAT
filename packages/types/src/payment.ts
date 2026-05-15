export type PaymentItemType = "booking" | "sheet";

export type PaymentStatus =
  | "pending_transfer"
  | "slip_uploaded"
  | "verifying"
  | "held_in_escrow"
  | "released_for_payout"
  | "paid_out"
  | "refunded"
  | "failed"
  | "disputed"
  | "partially_refunded";
// `verified` is deprecated and intentionally excluded from this union —
// the schema retains it because Postgres can't drop enum values, but no
// code path should emit or branch on it.

export type PayoutStatus = "pending" | "in_progress" | "completed" | "failed";

export interface PaymentIntent {
  id: string;
  itemType: PaymentItemType;
  itemId: string;
  payerId: string;
  amountThb: number;
  promptPayQrPayload: string;
  status: PaymentStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CreatePaymentIntentDto {
  itemType: PaymentItemType;
  itemId: string;
}

export interface UploadSlipDto {
  paymentIntentId: string;
  slipObjectKey: string;
}

export interface SlipVerificationResult {
  paymentIntentId: string;
  status: PaymentStatus;
  /** Bank transaction id from ZercleSlip — used for duplicate-slip dedupe. */
  transactionId?: string;
  failureReason?: string;
}

export interface ReportIssueDto {
  bookingId: string;
  reason: string;
  details: string;
}

export interface Payout {
  id: string;
  tutorId: string;
  periodStart: string;
  periodEnd: string;
  grossThb: number;
  commissionThb: number;
  withholdingTaxThb: number;
  netThb: number;
  scheduledAt: string;
  status: PayoutStatus;
  transferredAt?: string;
  transferredBy?: string;
  transferSlipKey?: string;
  notes?: string;
}

export interface GeneratePayoutBatchDto {
  /** ISO date for the batch (typically the 15th or 30th). */
  batchDate: string;
}

export interface MarkPayoutTransferredDto {
  /** R2/S3 object key the admin uploaded as proof of the manual transfer. */
  slipObjectKey: string;
  notes?: string;
}

export interface FailPayoutDto {
  reason: string;
}
