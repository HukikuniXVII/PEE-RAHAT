import type { ReportTargetType } from "./community";
import type { PayoutStatus, PaymentItemType, PaymentStatus } from "./payment";

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterDisplayName: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string;
  resolvedAt: string | null;
  createdAt: string;
}

export type KycReviewDecision = "approve" | "reject";

export interface AdminKycQueueItem {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  idPhotoUrl: string;
  selfieUrl: string;
  transcriptUrl: string;
  submittedAt: string;
}

export interface ReviewKycDto {
  decision: KycReviewDecision;
  reason?: string;
}

// FR-PM-01: payments awaiting manual review in /admin/payments.
export interface AdminPaymentRow {
  id: string;
  payerId: string;
  payerDisplayName: string;
  itemType: PaymentItemType;
  bookingId: string | null;
  sheetId: string | null;
  amountThb: number;
  status: PaymentStatus;
  slipObjectKey: string | null;
  /** Bank transaction id from ZercleSlip (was slipOkRef pre-refactor). */
  transactionId: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface RejectSlipDto {
  reason: string;
}

// FR-PM-06 / FR-PM-07: payout batches in /admin/payouts.
export interface AdminPayoutRow {
  id: string;
  tutorId: string;
  tutorDisplayName: string;
  periodStart: string;
  periodEnd: string;
  grossThb: number;
  commissionThb: number;
  withholdingTaxThb: number;
  netThb: number;
  scheduledAt: string;
  status: PayoutStatus;
  transferredAt: string | null;
  transferredBy: string | null;
  transferSlipKey: string | null;
  notes: string | null;
}

export interface ComputePayoutsDto {
  periodStart: string;
  periodEnd: string;
}

// FR-PM-06: queue of released-for-payout intents awaiting batch generation.
export interface AdminPayoutQueueGroup {
  tutorId: string;
  tutorDisplayName: string;
  tutorPromptPay: string | null;
  intentIds: string[];
  classCount: number;
  grossThb: number;
  commissionThb: number;
  withholdingTaxThb: number;
  netThb: number;
}
