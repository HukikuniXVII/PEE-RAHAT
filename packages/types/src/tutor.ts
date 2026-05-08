export type Subject =
  | "Math"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "English"
  | "Social"
  | "Thai";

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

export interface TutorSearchQuery {
  q?: string;
  subject?: Subject;
  university?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  availableOn?: string;
  sort?: "rating" | "priceAsc" | "priceDesc" | "newest";
  page?: number;
  pageSize?: number;
}

export interface TutorSearchResult {
  items: Tutor[];
  total: number;
  page: number;
  pageSize: number;
}
