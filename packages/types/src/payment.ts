import { z } from "zod";

export type PaymentItemType = "booking" | "sheet";

/** Loose ISO date parser used by payout DTOs that the controller hands
 *  to `new Date(...)`. Matches the dateStringSchema in admin.ts. */
const dateStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid date",
  });

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

export const generatePayoutBatchSchema = z.object({
  /** ISO date for the batch (typically the 15th or 30th). */
  batchDate: dateStringSchema,
});
export type GeneratePayoutBatchDto = z.infer<typeof generatePayoutBatchSchema>;

export const markPayoutTransferredSchema = z.object({
  /** R2/S3 object key the admin uploaded as proof of the manual transfer. */
  slipObjectKey: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});
export type MarkPayoutTransferredDto = z.infer<typeof markPayoutTransferredSchema>;

export const failPayoutSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type FailPayoutDto = z.infer<typeof failPayoutSchema>;
