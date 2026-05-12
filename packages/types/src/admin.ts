import type { ReportTargetType } from "./community";

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
