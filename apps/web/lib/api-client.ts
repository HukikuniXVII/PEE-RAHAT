import {
  API_PATHS,
  type AdminKycQueueItem,
  type AdminPaymentRow,
  type AdminPayoutRow,
  type AdminReport,
  type AvatarUploadIntent,
  type ComputePayoutsDto,
  type KycReviewDecision,
  type ApiError,
  type Booking,
  type BookingReportDto,
  type ChatMessage,
  type ChatThread,
  type CommunityPost,
  type CommunityReply,
  type CreateBookingDto,
  type CreatePaymentIntentDto,
  type CreatePostDto,
  type CreateReplyDto,
  type CreateReviewDto,
  type CreateSheetDto,
  type KycSubmitDto,
  type KycSubmission,
  type KycUploadIntent,
  type Page,
  type PaymentIntent,
  type ReportDto,
  type SendMessageDto,
  type SheetReportDto,
  type SheetUploadIntent,
  type SheetUploadKind,
  type SlipVerificationResult,
  type StudySheet,
  type Subject,
  type TcasDeadline,
  type TcasProgram,
  type TcasWhatIfRequest,
  type TcasWhatIfResult,
  type Tutor,
  type TutorOnboardingDto,
  type TutorProfileUpdateDto,
  type TutorReview,
  type TutorSearchQuery,
  type TutorSearchResult,
  type UploadSlipDto,
  type User,
  type UserProfileUpdateDto,
} from "@peerahat/types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

/**
 * Convenience for Server Components: route 404s from an api-client call to
 * the nearest not-found.tsx instead of letting them bubble up to error.tsx.
 * Must be called from a Server Component (next/navigation's notFound throws
 * a special signal that only Server Components catch).
 *
 * Usage: const tutor = await asNotFound(api.tutors.byId(id));
 */
export async function asNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 404) {
      const { notFound } = await import("next/navigation");
      notFound();
    }
    throw e;
  }
}

/**
 * When no explicit token is passed (the common case for client components
 * calling `createApiClient()` inside React Query callbacks), look up the
 * current Supabase session from the browser's cookie store and use its
 * access token. Server-side callers still pass tokens explicitly via
 * `createApiClient({ accessToken })`; this fallback is guarded on `window`
 * so it stays a no-op during SSR.
 */
async function getBrowserAccessToken(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const { createSupabaseBrowserClient } = await import("./supabase/client");
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const tokenToUse = accessToken ?? (await getBrowserAccessToken());
  if (tokenToUse) headers.set("Authorization", `Bearer ${tokenToUse}`);

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ApiError>;
    throw Object.assign(
      new Error(err.message ?? `Request failed: ${res.status}`),
      { statusCode: res.status, code: err.code, details: err.details },
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

export interface ApiClientOptions {
  accessToken?: string;
}

export function createApiClient(opts: ApiClientOptions = {}) {
  const token = opts.accessToken;

  return {
    users: {
      me: () => request<User>(API_PATHS.usersMe, {}, token),
      updateMe: (dto: UserProfileUpdateDto) =>
        request<User>(
          API_PATHS.usersMe,
          { method: "PATCH", body: JSON.stringify(dto) },
          token,
        ),
      requestAvatarUpload: (contentType: string) =>
        request<AvatarUploadIntent>(
          API_PATHS.usersAvatarIntent,
          { method: "POST", body: JSON.stringify({ contentType }) },
          token,
        ),
    },
    admin: {
      listReports: (
        opts: {
          page?: number;
          pageSize?: number;
          status?: "open" | "resolved";
        } = {},
      ) =>
        request<Page<AdminReport>>(
          `${API_PATHS.adminReports}${qs(opts)}`,
          {},
          token,
        ),
      resolveReport: (id: string) =>
        request<AdminReport>(
          API_PATHS.adminResolveReport(id),
          { method: "POST" },
          token,
        ),
      kycQueue: () =>
        request<AdminKycQueueItem[]>(API_PATHS.adminKycQueue, {}, token),
      reviewKyc: (id: string, decision: KycReviewDecision, reason?: string) =>
        request<{ id: string; status: string }>(
          API_PATHS.adminReviewKyc(id),
          { method: "POST", body: JSON.stringify({ decision, reason }) },
          token,
        ),
      paymentsQueue: (opts: { status?: "pending" | "success" | "failed" } = {}) =>
        request<AdminPaymentRow[]>(
          `${API_PATHS.adminPaymentsQueue}${qs(opts)}`,
          {},
          token,
        ),
      approvePayment: (id: string) =>
        request<AdminPaymentRow>(
          API_PATHS.adminApprovePayment(id),
          { method: "POST" },
          token,
        ),
      rejectPayment: (id: string, reason: string) =>
        request<AdminPaymentRow>(
          API_PATHS.adminRejectPayment(id),
          { method: "POST", body: JSON.stringify({ reason }) },
          token,
        ),
      payouts: (opts: { paid?: boolean } = {}) =>
        request<AdminPayoutRow[]>(
          `${API_PATHS.adminPayouts}${qs({ paid: opts.paid })}`,
          {},
          token,
        ),
      computePayouts: (dto: ComputePayoutsDto) =>
        request<AdminPayoutRow[]>(
          API_PATHS.adminComputePayouts,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      markPayoutPaid: (id: string) =>
        request<AdminPayoutRow>(
          API_PATHS.adminMarkPayoutPaid(id),
          { method: "POST" },
          token,
        ),
    },
    tutors: {
      search: (q: TutorSearchQuery) =>
        request<TutorSearchResult>(`${API_PATHS.tutors}${qs(q)}`, {}, token),
      onboard: (dto: TutorOnboardingDto) =>
        request<Tutor>(
          API_PATHS.tutorOnboarding,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      updateMe: (dto: TutorProfileUpdateDto) =>
        request<Tutor>(
          API_PATHS.tutorMe,
          { method: "PATCH", body: JSON.stringify(dto) },
          token,
        ),
      byId: (id: string) =>
        request<Tutor>(API_PATHS.tutorById(id), {}, token),
      reviews: (
        id: string,
        opts: { page?: number; pageSize?: number } = {},
      ) =>
        request<Page<TutorReview>>(
          `${API_PATHS.tutorReviews(id)}${qs(opts)}`,
          {},
          token,
        ),
      review: (tutorId: string, dto: CreateReviewDto) =>
        request<TutorReview>(
          API_PATHS.tutorReviews(tutorId),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    bookings: {
      create: (dto: CreateBookingDto) =>
        request<Booking>(
          API_PATHS.bookings,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      mine: () => request<Booking[]>(API_PATHS.bookings, {}, token),
      accept: (id: string) =>
        request<Booking>(
          API_PATHS.acceptBooking(id),
          { method: "POST" },
          token,
        ),
      report: (id: string, dto: BookingReportDto) =>
        request<void>(
          API_PATHS.reportBooking(id),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    sheets: {
      list: (
        opts: {
          subject?: Subject;
          q?: string;
          page?: number;
          pageSize?: number;
        } = {},
      ) =>
        request<Page<StudySheet>>(
          `${API_PATHS.sheets}${qs(opts)}`,
          {},
          token,
        ),
      byId: (id: string) =>
        request<StudySheet>(API_PATHS.sheetById(id), {}, token),
      download: (id: string) =>
        request<{ url: string; expiresAt: string }>(
          API_PATHS.sheetDownload(id),
          { method: "POST" },
          token,
        ),
      report: (dto: SheetReportDto) =>
        request<void>(
          API_PATHS.reportSheet(dto.sheetId),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      requestUpload: (kind: SheetUploadKind, contentType: string) =>
        request<SheetUploadIntent>(
          API_PATHS.sheetUploadIntents,
          {
            method: "POST",
            body: JSON.stringify({ kind, contentType }),
          },
          token,
        ),
      create: (dto: CreateSheetDto) =>
        request<StudySheet>(
          API_PATHS.sheets,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    tcas: {
      programs: (round?: string) =>
        request<TcasProgram[]>(
          `${API_PATHS.tcasPrograms}${qs({ round })}`,
          {},
          token,
        ),
      whatIf: (dto: TcasWhatIfRequest) =>
        request<TcasWhatIfResult>(
          API_PATHS.tcasWhatIf,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      deadlines: () =>
        request<TcasDeadline[]>(API_PATHS.tcasDeadlines, {}, token),
    },
    community: {
      list: (page = 1) =>
        request<Page<CommunityPost>>(
          `${API_PATHS.community}${qs({ page })}`,
          {},
          token,
        ),
      create: (dto: CreatePostDto) =>
        request<CommunityPost>(
          API_PATHS.community,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      upvote: (id: string) =>
        request<{ upvotes: number }>(
          API_PATHS.upvotePost(id),
          { method: "POST" },
          token,
        ),
      replies: (
        postId: string,
        opts: { page?: number; pageSize?: number } = {},
      ) =>
        request<Page<CommunityReply>>(
          `${API_PATHS.postReplies(postId)}${qs(opts)}`,
          {},
          token,
        ),
      reply: (dto: CreateReplyDto) =>
        request<CommunityReply>(
          API_PATHS.postReplies(dto.postId),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    kyc: {
      requestUpload: (field: KycUploadIntent["field"], contentType: string) =>
        request<KycUploadIntent>(
          API_PATHS.kycUploadIntents,
          {
            method: "POST",
            body: JSON.stringify({ field, contentType }),
          },
          token,
        ),
      submit: (dto: KycSubmitDto) =>
        request<KycSubmission>(
          API_PATHS.kycSubmit,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    payments: {
      createIntent: (dto: CreatePaymentIntentDto) =>
        request<PaymentIntent>(
          API_PATHS.paymentIntents,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      uploadSlip: (dto: UploadSlipDto) =>
        request<SlipVerificationResult>(
          API_PATHS.uploadSlip,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    chat: {
      threads: () => request<ChatThread[]>(API_PATHS.chatThreads, {}, token),
      openWithTutor: (tutorId: string) =>
        request<ChatThread>(
          API_PATHS.chatThreadWithTutor(tutorId),
          { method: "POST" },
          token,
        ),
      threadById: (threadId: string) =>
        request<ChatThread>(API_PATHS.chatThreadById(threadId), {}, token),
      markRead: (threadId: string) =>
        request<void>(
          API_PATHS.chatThreadRead(threadId),
          { method: "POST" },
          token,
        ),
      messages: (threadId: string) =>
        request<ChatMessage[]>(API_PATHS.chatMessages(threadId), {}, token),
      send: (dto: SendMessageDto) =>
        request<ChatMessage>(
          API_PATHS.chatMessages(dto.threadId),
          { method: "POST", body: JSON.stringify({ body: dto.body }) },
          token,
        ),
    },
    reports: {
      submit: (dto: ReportDto) =>
        request<void>(
          API_PATHS.reports,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
