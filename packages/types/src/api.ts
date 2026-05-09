/**
 * Generic envelopes and error shapes returned by apps/api.
 */
export interface ApiError {
  statusCode: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const API_PATHS = {
  usersMe: "/users/me",
  tutors: "/tutors",
  tutorById: (id: string) => `/tutors/${id}`,
  tutorReviews: (id: string) => `/tutors/${id}/reviews`,
  bookings: "/bookings",
  bookingById: (id: string) => `/bookings/${id}`,
  acceptBooking: (id: string) => `/bookings/${id}/accept`,
  reportBooking: (id: string) => `/bookings/${id}/report`,
  sheets: "/sheets",
  sheetById: (id: string) => `/sheets/${id}`,
  sheetDownload: (id: string) => `/sheets/${id}/download`,
  sheetUploadIntents: "/sheets/upload-intents",
  reportSheet: (id: string) => `/sheets/${id}/report`,
  tcasPrograms: "/tcas/programs",
  tcasWhatIf: "/tcas/what-if",
  tcasDeadlines: "/tcas/deadlines",
  community: "/community/posts",
  postById: (id: string) => `/community/posts/${id}`,
  upvotePost: (id: string) => `/community/posts/${id}/upvote`,
  postReplies: (id: string) => `/community/posts/${id}/replies`,
  reports: "/reports",
  quizQuestions: "/quiz/questions",
  quizSubmit: "/quiz/submit",
  kycUploadIntents: "/kyc/upload-intents",
  kycSubmit: "/kyc/submit",
  paymentIntents: "/payments/intents",
  uploadSlip: "/payments/slips",
  chatThreads: "/chat/threads",
  chatThreadById: (threadId: string) => `/chat/threads/${threadId}`,
  chatThreadWithTutor: (tutorId: string) => `/chat/threads/with/${tutorId}`,
  chatMessages: (threadId: string) => `/chat/threads/${threadId}/messages`,
  chatThreadRead: (threadId: string) => `/chat/threads/${threadId}/read`,
} as const;
