import { z } from "zod";

import { dateStringSchema } from "./time";

export const paymentItemTypeSchema = z.enum(["booking", "sheet"]);
export type PaymentItemType = z.infer<typeof paymentItemTypeSchema>;


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

export const createPaymentIntentSchema = z.object({
  itemType: paymentItemTypeSchema,
  itemId: z.string().min(1),
});
export type CreatePaymentIntentDto = z.infer<typeof createPaymentIntentSchema>;

export const uploadSlipSchema = z.object({
  paymentIntentId: z.string().min(1),
  slipObjectKey: z.string().min(1),
});
export type UploadSlipDto = z.infer<typeof uploadSlipSchema>;

// FR-PM-01: signed PUT for the payer's slip image. Flow mirrors KYC —
// frontend asks for an upload URL, PUTs the file to S3 directly, then
// posts the returned objectKey via uploadSlip(). Before this the
// payment-dialog was inventing a fake key and never uploading the file,
// which left admins seeing a broken image in /admin/payments.
export const slipRequestUploadSchema = z.object({
  paymentIntentId: z.string().min(1),
  contentType: z.string().min(1),
});
export type SlipRequestUploadDto = z.infer<typeof slipRequestUploadSchema>;

export interface SlipUploadIntent {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface SlipVerificationResult {
  paymentIntentId: string;
  status: PaymentStatus;
  /** Bank transaction id from ZercleSlip — used for duplicate-slip dedupe. */
  transactionId?: string;
  failureReason?: string;
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
