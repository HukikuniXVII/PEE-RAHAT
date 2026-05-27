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
  adminReportsQueue: "/admin/reports/queue",
  adminReportsOverdue: "/admin/reports/overdue",
  adminReportById: (id: string) => `/admin/reports/${id}`,
  adminReportRelated: (id: string) => `/admin/reports/${id}/related`,
  adminAssignReport: (id: string) => `/admin/reports/${id}/assign`,
  adminReportStatus: (id: string) => `/admin/reports/${id}/status`,
  adminResolveReport: (id: string) => `/admin/reports/${id}/resolve`,
  adminReportDuplicate: (id: string) => `/admin/reports/${id}/duplicate-of`,
  adminReportNote: (id: string) => `/admin/reports/${id}/note`,
  adminKycQueue: "/admin/kyc/queue",
  adminKycById: (id: string) => `/admin/kyc/${id}`,
  adminReviewKyc: (id: string) => `/admin/kyc/${id}/review`,
  adminTutorPassbook: (tutorId: string) =>
    `/admin/tutors/${tutorId}/passbook`,
  // FR-TH-02: admin toggle for /tutors search visibility.
  adminTutorVisibility: (tutorId: string) =>
    `/admin/tutors/${tutorId}/visibility`,
  adminPaymentsQueue: "/admin/payments/queue",
  adminPaymentSlip: (id: string) => `/admin/payments/${id}/slip`,
  adminApprovePayment: (id: string) => `/admin/payments/${id}/approve`,
  adminRejectPayment: (id: string) => `/admin/payments/${id}/reject`,
  adminRegenerateMeet: (id: string) =>
    `/admin/bookings/${id}/regenerate-meet`,
  adminRevealTutorBank: (tutorId: string) =>
    `/admin/tutors/${tutorId}/bank/reveal`,
  adminBankChanges: "/admin/tutors/bank-changes",
  adminApproveBankChange: (tutorId: string) =>
    `/admin/tutors/${tutorId}/bank/approve`,
  adminRejectBankChange: (tutorId: string) =>
    `/admin/tutors/${tutorId}/bank/reject`,
  adminUsers: "/admin/users",
  adminUserById: (id: string) => `/admin/users/${id}`,
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
  // FR-TH-06: student cancels their own 1-on-1 booking before payment.
  cancelBooking: (id: string) => `/bookings/${id}/cancel`,
  // FR-TH-06: tutor rejects a still-requested booking.
  rejectBooking: (id: string) => `/bookings/${id}/reject`,
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
  adminTcasCriteriaParseAi: "/admin/tcas/criteria/parse-ai",
  adminTcasCriteriaReparse: "/admin/tcas/criteria/parse-ai/reparse",
  adminTcasCriteriaCommit: "/admin/tcas/criteria/commit",
  adminTcasImports: "/admin/tcas/imports",
  adminAiUsage: "/admin/ai-usage",
  community: "/community/posts",
  postById: (id: string) => `/community/posts/${id}`,
  upvotePost: (id: string) => `/community/posts/${id}/upvote`,
  postReplies: (id: string) => `/community/posts/${id}/replies`,
  reports: "/reports",
  reportsMine: "/reports/mine",
  reportById: (id: string) => `/reports/${id}`,
  reportComment: (id: string) => `/reports/${id}/comment`,
  reportUploadEvidence: "/reports/upload-evidence",
  notifications: "/notifications",
  // FR-CM-08 — paginated feed + bell badge + prefs.
  notificationsUnreadCount: "/notifications/unread-count",
  notificationPreferences: "/notifications/preferences",
  notificationsStream: "/notifications/stream",
  notificationRead: (id: string) => `/notifications/${id}/read`,
  notificationsReadAll: "/notifications/read-all",
  // FR-CM-08 Phase 3 — web push subscribe + devices + test.
  pushVapidPublicKey: "/push/vapid-public-key",
  pushSubscribe: "/push/subscribe",
  pushDevices: "/push/devices",
  pushDeviceById: (id: string) => `/push/devices/${id}`,
  pushTest: "/push/test",
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
  // FR-TH-18 group sessions
  inviteToBooking: (id: string) => `/bookings/${id}/invite`,
  extendBookingInvite: (id: string) => `/bookings/${id}/invite/extend`,
  bookingParticipants: (id: string) => `/bookings/${id}/participants`,
  bookingsGroupPending: "/bookings/group-pending",
  bookingGroupApprove: (id: string) => `/bookings/${id}/group-approve`,
  bookingGroupReject: (id: string) => `/bookings/${id}/group-reject`,
  inviteSummary: (code: string) => `/invites/${code}`,
  inviteAccept: (code: string) => `/invites/${code}/accept`,
  inviteDecline: (code: string) => `/invites/${code}/decline`,
} as const;
