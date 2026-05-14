export type PaymentItemType = "booking" | "sheet";

export type PaymentStatus =
  | "pending_transfer"
  | "slip_uploaded"
  | "verifying"
  | "verified"
  | "held_in_escrow"
  | "released"
  | "refunded"
  | "failed"
  | "disputed"
  | "partially_refunded";

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
  slipOkRef?: string;
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
  paidAt?: string;
}
