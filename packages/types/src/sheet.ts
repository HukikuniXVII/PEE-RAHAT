import { z } from "zod";

import { type Subject, subjectSchema } from "./tutor";

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

export const sheetUploadKindSchema = z.enum(["pdf", "preview"]);

export type SheetUploadKind = z.infer<typeof sheetUploadKindSchema>;

export interface SheetUploadIntent {
  kind: SheetUploadKind;
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export const sheetUploadIntentRequestSchema = z.object({
  kind: sheetUploadKindSchema,
  contentType: z.string().min(1),
});

export type SheetUploadIntentRequestDto = z.infer<
  typeof sheetUploadIntentRequestSchema
>;

export const createSheetSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  subject: subjectSchema,
  priceThb: z.coerce.number().int().min(0).max(100_000),
  pdfObjectKey: z.string().min(1),
  previewImageObjectKeys: z.array(z.string().min(1)).min(1).max(8),
  introVideoUrl: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().url().optional(),
  ),
});

export type CreateSheetDto = z.infer<typeof createSheetSchema>;

export type SheetReportDto = z.infer<typeof sheetReportSchema>;

export interface SheetDownloadTicket {
  url: string;
  expiresAt: string;
}
