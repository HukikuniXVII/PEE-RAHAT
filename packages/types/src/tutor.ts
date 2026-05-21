import { z } from "zod";

// Subject codes are aligned with the TCAS exam structure. The list is
// ordered for UI rendering (TGAT/TPAT first, then core subjects, then
// languages). Tutors store these strings in Postgres String[] — no DB
// migration needed; older tutors keep their existing codes.
export const subjectSchema = z.enum([
  // TCAS exams
  "TGAT",
  "TPAT1",
  "TPAT2",
  "TPAT3",
  "TPAT4",
  "TPAT5",
  // Core subjects
  "Math",
  "AppliedScience",
  "Physics",
  "Chemistry",
  "Biology",
  "Thai",
  "Social",
  "English",
  // Languages
  "French",
  "German",
  "Japanese",
  "Korean",
  "Chinese",
  "Pali",
  "Spanish",
]);

export type Subject = z.infer<typeof subjectSchema>;

// Canonical Thai display labels for Subject codes. Used by tutor
// profile, onboarding, profile-edit, booking, and filter UIs so every
// surface renders the same string. Compact chip variants (e.g.
// tutor-card) can keep their own shorter abbreviations.
export const SUBJECT_LABELS: Record<Subject, string> = {
  TGAT: "TGAT",
  TPAT1: "TPAT1",
  TPAT2: "TPAT2",
  TPAT3: "TPAT3",
  TPAT4: "TPAT4",
  TPAT5: "TPAT5",
  Math: "คณิตศาสตร์",
  AppliedScience: "วิทยาศาสตร์ประยุกต์",
  Physics: "ฟิสิกส์",
  Chemistry: "เคมี",
  Biology: "ชีววิทยา",
  Thai: "ภาษาไทย",
  Social: "สังคมศึกษา",
  English: "ภาษาอังกฤษ",
  French: "ภาษาฝรั่งเศส",
  German: "ภาษาเยอรมัน",
  Japanese: "ภาษาญี่ปุ่น",
  Korean: "ภาษาเกาหลี",
  Chinese: "ภาษาจีน",
  Pali: "ภาษาบาลี",
  Spanish: "ภาษาสเปน",
};

// Long-form descriptors for TPAT codes. Pair with SUBJECT_LABELS via
// `title` (tooltip) so the chip text stays short.
export const SUBJECT_TOOLTIPS: Partial<Record<Subject, string>> = {
  TPAT1: "วิชาเฉพาะ กสพท",
  TPAT2: "ความถนัดศิลปกรรมศาสตร์",
  TPAT3: "ความถนัดด้านวิทยาศาสตร์ เทคโนโลยี และวิศวกรรมศาสตร์",
  TPAT4: "ความถนัดทางสถาปัตยกรรมศาสตร์",
  TPAT5: "ความถนัดครุศาสตร์-ศึกษาศาสตร์",
};

export const tutorSortSchema = z.enum([
  "rating",
  "priceAsc",
  "priceDesc",
  "newest",
]);

export type TutorSort = z.infer<typeof tutorSortSchema>;

export interface Tutor {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  university: string;
  faculty: string;
  subjects: Subject[];
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  introVideoUrl?: string;
  avatarUrl: string;
  /** FR-TH-17: tutor has connected a Google account; required for search visibility. */
  googleConnected: boolean;
}

export interface TutorReview {
  id: string;
  bookingId: string;
  studentId: string;
  studentDisplayName: string;
  tutorId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string;
}

export const reviewRatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export type ReviewRating = z.infer<typeof reviewRatingSchema>;

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: reviewRatingSchema,
  text: z.string().trim().min(1).max(2000),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;

export const tutorOnboardingSchema = z.object({
  bio: z.string().trim().min(20, "ช่วยเล่าตัวเองสั้นๆ อย่างน้อย 20 ตัวอักษร").max(2000),
  university: z.string().trim().min(1).max(120),
  faculty: z.string().trim().min(1).max(120),
  hourlyRate: z.coerce.number().int().min(0).max(20000),
  subjects: z.array(subjectSchema).min(1, "เลือกอย่างน้อย 1 วิชา"),
  introVideoUrl: z
    .string()
    .trim()
    .url("กรอก URL ให้ถูกต้อง")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type TutorOnboardingDto = z.infer<typeof tutorOnboardingSchema>;

// FR-TH-03: tutor edits their own profile after onboarding. Same field
// rules as onboarding but every field is optional so the client can PATCH
// just what changed.
export const tutorProfileUpdateSchema = tutorOnboardingSchema.partial();

export type TutorProfileUpdateDto = z.infer<typeof tutorProfileUpdateSchema>;

export const tutorSearchQuerySchema = z.object({
  q: z.string().optional(),
  subject: subjectSchema.optional(),
  university: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  availableOn: z.string().optional(),
  sort: tutorSortSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type TutorSearchQuery = z.infer<typeof tutorSearchQuerySchema>;

export interface TutorSearchResult {
  items: Tutor[];
  total: number;
  page: number;
  pageSize: number;
}
