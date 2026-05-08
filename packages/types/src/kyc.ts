export type KycStatus = "not_started" | "pending" | "verified" | "rejected";

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
  field: "idPhoto" | "selfie" | "transcript";
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface KycSubmitDto {
  idPhotoKey: string;
  selfieKey: string;
  transcriptKey: string;
  consentPdpaAccepted: boolean;
}
