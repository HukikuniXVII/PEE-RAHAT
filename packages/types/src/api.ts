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
  usersAvatarIntent: "/users/me/avatar-intent",
  adminReports: "/admin/reports",
  adminResolveReport: (id: string) => `/admin/reports/${id}/resolve`,
  adminKycQueue: "/admin/kyc/queue",
  adminKycById: (id: string) => `/admin/kyc/${id}`,
  adminReviewKyc: (id: string) => `/admin/kyc/${id}/review`,
  adminTutorPassbook: (tutorId: string) =>
    `/admin/tutors/${tutorId}/passbook`,
  adminPaymentsQueue: "/admin/payments/queue",
  adminApprovePayment: (id: string) => `/admin/payments/${id}/approve`,
  adminRejectPayment: (id: string) => `/admin/payments/${id}/reject`,
  adminRegenerateMeet: (id: string) =>
    `/admin/bookings/${id}/regenerate-meet`,
  adminRevealTutorBank: (tutorId: string) =>
    `/admin/tutors/${tutorId}/bank/reveal`,
  adminPayouts: "/admin/payouts",
  adminPayoutById: (id: string) => `/admin/payouts/${id}`,
  adminComputePayouts: "/admin/payouts/compute",
  adminPayoutQueue: "/admin/payouts/queue",
  adminGeneratePayoutBatch: "/admin/payouts/generate-batch",
  adminMarkPayoutTransferred: (id: string) =>
    `/admin/payouts/${id}/mark-transferred`,
  adminFailPayout: (id: string) => `/admin/payouts/${id}/fail`,
  tutors: "/tutors",
  tutorOnboarding: "/tutors/onboarding",
  tutorMe: "/tutors/me",
  tutorById: (id: string) => `/tutors/${id}`,
  tutorReviews: (id: string) => `/tutors/${id}/reviews`,
  tutorAvailability: (id: string) => `/tutors/${id}/availability`,
  tutorMyUnavailability: "/tutors/me/unavailability",
  tutorMyUnavailabilityById: (id: string) => `/tutors/me/unavailability/${id}`,
  tutorMyBank: "/tutors/me/bank",
  bookings: "/bookings",
  bookingsMineBusy: "/bookings/mine/busy",
  bookingById: (id: string) => `/bookings/${id}`,
  acceptBooking: (id: string) => `/bookings/${id}/accept`,
  reportBooking: (id: string) => `/bookings/${id}/report`,
  postponeBooking: (id: string) => `/bookings/${id}/postpone`,
  postponePropose: (id: string) => `/bookings/${id}/postpone/propose`,
  postponeConfirm: (id: string) => `/bookings/${id}/postpone/confirm`,
  postponeCancel: (id: string) => `/bookings/${id}/postpone/cancel`,
  sheets: "/sheets",
  sheetById: (id: string) => `/sheets/${id}`,
  sheetDownload: (id: string) => `/sheets/${id}/download`,
  sheetUploadIntents: "/sheets/upload-intents",
  reportSheet: (id: string) => `/sheets/${id}/report`,
  tcasPrograms: "/tcas/programs",
  tcasWhatIf: "/tcas/what-if",
  tcasDeadlines: "/tcas/deadlines",
  adminTcasCriteriaPreview: "/admin/tcas/criteria/preview",
  adminTcasCriteriaCommit: "/admin/tcas/criteria/commit",
  adminTcasCriteriaParsePdf: "/admin/tcas/criteria/parse-pdf",
  adminTcasImports: "/admin/tcas/imports",
  adminTcasExamCatalogue: "/admin/tcas/exam-catalogue",
  community: "/community/posts",
  postById: (id: string) => `/community/posts/${id}`,
  upvotePost: (id: string) => `/community/posts/${id}/upvote`,
  postReplies: (id: string) => `/community/posts/${id}/replies`,
  reports: "/reports",
  quizQuestions: "/quiz/questions",
  quizSubmit: "/quiz/submit",
  kycUploadIntents: "/kyc/upload-intents",
  kycSubmit: "/kyc/submit",
  authGoogleConnect: "/auth/google/connect",
  authGoogleDisconnect: "/auth/google/disconnect",
  authGoogleStatus: "/auth/google/status",
  paymentIntents: "/payments/intents",
  uploadSlip: "/payments/slips",
  chatThreads: "/chat/threads",
  chatThreadById: (threadId: string) => `/chat/threads/${threadId}`,
  chatThreadWithTutor: (tutorId: string) => `/chat/threads/with/${tutorId}`,
  chatMessages: (threadId: string) => `/chat/threads/${threadId}/messages`,
  chatThreadRead: (threadId: string) => `/chat/threads/${threadId}/read`,
} as const;
