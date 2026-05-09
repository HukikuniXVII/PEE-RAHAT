import { z } from "zod";

export const kycStatusSchema = z.enum([
  "not_started",
  "pending",
  "verified",
  "rejected",
]);

export type KycStatus = z.infer<typeof kycStatusSchema>;

export const kycFieldSchema = z.enum(["idPhoto", "selfie", "transcript"]);

export type KycField = z.infer<typeof kycFieldSchema>;

export interface KycSubmission {
  id: string;
  userId: string;
  idPhotoKey: string;
  selfieKey: string;
  transcriptKey: string;
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
  consentPdpaAccepted: z.boolean().refine((v) => v === true, {
    message: "PDPA consent required",
  }),
});

export type KycSubmitDto = z.infer<typeof kycSubmitSchema>;
