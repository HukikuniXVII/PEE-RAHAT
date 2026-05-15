import type { ReportTargetType } from "./community";
import type { BankName, KycStatus } from "./kyc";
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
  /** FR-TH-02: masked bank info — admin sanity-checks before clicking
   *  reveal. */
  bankName: BankName | null;
  bankAccountLast4: string | null;
  bankAccountName: string | null;
  intentIds: string[];
  classCount: number;
  grossThb: number;
  commissionThb: number;
  withholdingTaxThb: number;
  netThb: number;
}

/** FR-TH-02: admin reveal — full account number, audit-logged. */
export interface AdminRevealedBankInfo {
  bankName: BankName;
  accountNumber: string;
  accountName: string;
}

/**
 * FR-TH-02 / FR-PM-06: bundled passbook + bank info shown on admin KYC
 * detail, payout detail, and tutor detail pages. The imageUrl is a signed
 * GET URL with a 5-minute expiry — clients must not cache it. Returned
 * as `null` when the tutor has no passbook on file yet (pre-feature
 * legacy tutors). Every read writes an AdminAuditLog row server-side.
 */
export interface AdminPassbookView {
  imageUrl: string;
  imageExpiresAt: string;
  bankName: BankName;
  bankAccountNumberFull: string;
  bankAccountName: string;
}

/** FR-TH-02: detail view for a single KYC submission (per-id). */
export interface AdminKycDetail {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  idPhotoUrl: string;
  selfieUrl: string;
  transcriptUrl: string;
  /** Legal name from the tutor's National ID. Used to detect mismatches
   *  against bankAccountName. May be null on legacy submissions. */
  idName: string | null;
  status: KycStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  passbook: AdminPassbookView | null;
}

/** FR-PM-06: detail view for a single payout row (per-id) — adds the
 *  tutor's passbook block so the admin can cross-check before transfer. */
export interface AdminPayoutDetail extends AdminPayoutRow {
  passbook: AdminPassbookView | null;
}
