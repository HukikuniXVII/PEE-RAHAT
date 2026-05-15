import { z } from "zod";

export const kycStatusSchema = z.enum([
  "not_started",
  "pending",
  "verified",
  "rejected",
]);

export type KycStatus = z.infer<typeof kycStatusSchema>;

export const kycFieldSchema = z.enum([
  "idPhoto",
  "selfie",
  "transcript",
  "passbook",
]);

export type KycField = z.infer<typeof kycFieldSchema>;

// FR-TH-02: Thai retail banks accepted for tutor payouts. SCB / KBank /
// Krungthai cover ~80% of accounts in practice; the rest are listed for
// completeness. "Other" is a safety valve — admin manually verifies the
// account during KYC review.
export const bankNameSchema = z.enum([
  "SCB",
  "KBank",
  "Krungthai",
  "Bangkok",
  "TMB",
  "Kiatnakin",
  "CIMB",
  "UOB",
  "TTB",
  "GSB",
  "BAAC",
  "GHB",
  "LH",
  "ICBC",
  "TISCO",
  "Other",
]);

export type BankName = z.infer<typeof bankNameSchema>;

export const bankInfoSchema = z.object({
  bankName: bankNameSchema,
  bankAccountNumber: z
    .string()
    .regex(/^\d{10,15}$/, "เลขบัญชีต้องเป็นตัวเลข 10-15 หลัก"),
  bankAccountName: z
    .string()
    .trim()
    .min(2, "ชื่อบัญชีสั้นเกินไป")
    .max(100),
});

export type BankInfo = z.infer<typeof bankInfoSchema>;

/** Masked bank info for non-admin API responses (FR-TH-02). */
export interface MaskedBankInfo {
  bankName: BankName;
  accountLast4: string;
  accountName: string;
  updatedAt: string;
}

export interface KycSubmission {
  id: string;
  userId: string;
  idPhotoKey: string;
  selfieKey: string;
  transcriptKey: string;
  passbookObjectKey?: string;
  status: KycStatus;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface KycUploadIntent {
  field: KycField;
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export const kycRequestUploadSchema = z.object({
  field: kycFieldSchema,
  contentType: z.string().min(1),
});

export type KycRequestUploadDto = z.infer<typeof kycRequestUploadSchema>;

export const kycSubmitSchema = z.object({
  idPhotoKey: z.string().min(1),
  selfieKey: z.string().min(1),
  transcriptKey: z.string().min(1),
  passbookObjectKey: z.string().min(1),
  idName: z.string().trim().min(2, "กรอกชื่อ-นามสกุลตามบัตรประชาชน").max(120),
  bank: bankInfoSchema,
  consentPdpaAccepted: z.boolean().refine((v) => v === true, {
    message: "PDPA consent required",
  }),
});

export type KycSubmitDto = z.infer<typeof kycSubmitSchema>;

// FR-TH-02: profile-edit surface for tutors to change their bank info
// after KYC approval. bankAccountName has to match idName from the
// original KYC submission (server enforces). idName is accepted here as
// a fallback for legacy tutors whose KYC was submitted before FR-TH-02
// added the column — the server uses it to back-fill the KYC row on
// first bank-info entry, then enforces the match on future edits.
export const updateBankSchema = z.object({
  bank: bankInfoSchema,
  passbookObjectKey: z.string().min(1),
  idName: z.string().trim().min(2).max(120).optional(),
});

export type UpdateBankDto = z.infer<typeof updateBankSchema>;
