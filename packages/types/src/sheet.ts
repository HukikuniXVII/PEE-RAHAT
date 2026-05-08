import type { Subject } from "./tutor";

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

export interface SheetReportDto {
  sheetId: string;
  reason: "copyright" | "fraud" | "lowQuality" | "other";
  details: string;
}

export interface SheetDownloadTicket {
  url: string;
  expiresAt: string;
}
