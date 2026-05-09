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
