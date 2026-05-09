import { z } from "zod";

import type { Subject } from "./tutor";

export const sheetReportReasonSchema = z.enum([
  "copyright",
  "fraud",
  "lowQuality",
  "other",
]);

export type SheetReportReason = z.infer<typeof sheetReportReasonSchema>;

export const sheetReportSchema = z.object({
  sheetId: z.string().min(1),
  reason: sheetReportReasonSchema,
  details: z.string().min(1).max(2000),
});

export interface StudySheet {
  id: string;
  sellerId: string;
  sellerDisplayName: string;
  sellerUniversity: string;
  sellerFaculty: string;
  title: string;
  description: string;
  subject: Subject;
  priceThb: number;
  rating: number;
  reviewCount: number;
  previewImageUrls: string[];
  introVideoUrl?: string;
  pageCount: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface CreateSheetDto {
  title: string;
  description: string;
  subject: Subject;
  priceThb: number;
  pdfObjectKey: string;
  previewImageObjectKeys: string[];
  introVideoUrl?: string;
}

export type SheetReportDto = z.infer<typeof sheetReportSchema>;

export interface SheetDownloadTicket {
  url: string;
  expiresAt: string;
}
