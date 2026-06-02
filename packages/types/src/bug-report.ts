import { z } from "zod";

// Bug report system (product feedback) — separate from the content
// Report system in reports.ts. DTOs + view shapes shared by apps/api and
// apps/web.

export const BUG_SEVERITIES = ["minor", "normal", "blocker"] as const;
export const BUG_CATEGORIES = [
  "ui",
  "broken_link",
  "payment",
  "booking",
  "chat",
  "performance",
  "other",
] as const;
export const BUG_STATUSES = [
  "open",
  "in_progress",
  "fixed",
  "wont_fix",
  "duplicate",
] as const;
export const BUG_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const bugSeveritySchema = z.enum(BUG_SEVERITIES);
export const bugCategorySchema = z.enum(BUG_CATEGORIES);
export const bugStatusSchema = z.enum(BUG_STATUSES);
export const bugPrioritySchema = z.enum(BUG_PRIORITIES);

export type BugSeverity = z.infer<typeof bugSeveritySchema>;
export type BugCategory = z.infer<typeof bugCategorySchema>;
export type BugStatus = z.infer<typeof bugStatusSchema>;
export type BugPriority = z.infer<typeof bugPrioritySchema>;

/** Max screenshots per report + per-file size cap (enforced on upload). */
export const BUG_MAX_SCREENSHOTS = 3;
export const BUG_SCREENSHOT_MAX_MB = 5;

/** Body for POST /bug-reports. Client captures pageUrl / userAgent /
 *  viewport / appVersion automatically; screenshots are pre-uploaded via
 *  /bug-reports/upload-evidence and referenced here by object key. */
export const createBugReportSchema = z.object({
  title: z.string().trim().min(5, "อย่างน้อย 5 ตัวอักษร").max(120),
  description: z.string().trim().min(20, "อย่างน้อย 20 ตัวอักษร").max(3000),
  severity: bugSeveritySchema,
  category: bugCategorySchema,
  pageUrl: z.string().trim().min(1).max(2048),
  userAgent: z.string().trim().min(1).max(1024),
  viewport: z.string().trim().min(1).max(32),
  appVersion: z.string().trim().max(64).optional(),
  screenshotKeys: z.array(z.string().min(1)).max(BUG_MAX_SCREENSHOTS).default([]),
  consoleLog: z.string().max(20_000).optional(),
});

export type CreateBugReportDto = z.infer<typeof createBugReportSchema>;

/** Admin triage patch — every field optional; nullable ones may be cleared. */
export const adminUpdateBugReportSchema = z
  .object({
    status: bugStatusSchema.optional(),
    priority: bugPrioritySchema.optional(),
    assignedToId: z.string().nullable().optional(),
    resolutionNote: z.string().trim().max(3000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "ไม่มีข้อมูลที่จะอัปเดต",
  });

export type AdminUpdateBugReportDto = z.infer<typeof adminUpdateBugReportSchema>;

export interface BugScreenshotUploadResult {
  objectKey: string;
}

export interface CreateBugReportResult {
  id: string;
}

/** A user's own bug report (GET /bug-reports/mine). */
export interface MyBugReport {
  id: string;
  title: string;
  category: BugCategory;
  severity: BugSeverity;
  status: BugStatus;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin queue row (GET /admin/bug-reports/queue). */
export interface AdminBugReportRow {
  id: string;
  title: string;
  category: BugCategory;
  severity: BugSeverity;
  status: BugStatus;
  priority: BugPriority;
  viewport: string;
  reporterId: string | null;
  reporterName: string | null;
  assignedToId: string | null;
  createdAt: string;
}

/** Admin detail (GET /admin/bug-reports/:id). screenshotUrls are short-lived
 *  signed GETs minted server-side from screenshotKeys. */
export interface AdminBugReportDetail {
  id: string;
  title: string;
  description: string;
  category: BugCategory;
  severity: BugSeverity;
  status: BugStatus;
  priority: BugPriority;
  pageUrl: string;
  userAgent: string;
  viewport: string;
  appVersion: string | null;
  consoleLog: string | null;
  screenshotKeys: string[];
  screenshotUrls: string[];
  reporterId: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  assignedToId: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}
