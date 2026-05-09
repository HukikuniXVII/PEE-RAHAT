import { z } from "zod";

export const subjectSchema = z.enum([
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Social",
  "Thai",
]);

export type Subject = z.infer<typeof subjectSchema>;

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
