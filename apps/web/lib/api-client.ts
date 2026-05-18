import {
  API_PATHS,
  type AdminKycDetail,
  type AdminKycQueueItem,
  type AdminPassbookView,
  type AdminPaymentRow,
  type AdminPayoutDetail,
  type AdminPayoutQueueGroup,
  type AdminPayoutRow,
  type AdminReport,
  type AvatarUploadIntent,
  type ComputePayoutsDto,
  type FailPayoutDto,
  type GeneratePayoutBatchDto,
  type MarkPayoutTransferredDto,
  type CreateUnavailabilityDto,
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
  type MaskedBankInfo,
  type UpdateBankDto,
  type AvailabilityResult,
  type Page,
  type PaymentIntent,
  type PostponeConfirmResult,
  type PostponeOpenResult,
  type PostponeRequestDto,
  type ProposeSlotDto,
  type ReportDto,
  type SendMessageDto,
  type SheetReportDto,
  type SheetUploadIntent,
  type SheetUploadKind,
  type SlipVerificationResult,
  type StudySheet,
  type Subject,
  type TcasCommitResult,
  type TcasCriteriaPreviewResponse,
  type TcasDeadline,
  type TcasExamCatalogueEntry,
  type TcasImportAuditEntry,
  type TcasProgram,
  type TcasWhatIfRequest,
  type TcasWhatIfResult,
  type Tutor,
  type TutorOnboardingDto,
  type TutorProfileUpdateDto,
  type TutorReview,
  type TutorSearchQuery,
  type TutorSearchResult,
  type TutorUnavailability,
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

/**
 * Force-refresh the Supabase session and return the new access token.
 * Called from request() on a 401 to recover from the rare case where the
 * SDK's implicit refresh missed an expiry (clock skew, suspended tab, JWKS
 * rotation). Returns undefined when refresh fails so the caller falls
 * through to the original 401 — which the route's auth gate handles.
 */
async function refreshBrowserAccessToken(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const { createSupabaseBrowserClient } = await import("./supabase/client");
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.refreshSession();
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
  const explicitToken = accessToken;
  const tokenToUse = explicitToken ?? (await getBrowserAccessToken());
  if (tokenToUse) headers.set("Authorization", `Bearer ${tokenToUse}`);

  const url = `${baseUrl}${path}`;
  const fetchInit: RequestInit = {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  };
  let res = await fetch(url, fetchInit);

  // Browser-side transparent 401 refresh: when the token came from the
  // Supabase session (no explicit accessToken arg) and the API rejected
  // it, force-refresh once and retry. Server callers pass a snapshotted
  // token via createApiClient({ accessToken }) and can't be refreshed
  // mid-request — let the 401 bubble so requireAuth bounces to /login.
  if (res.status === 401 && explicitToken === undefined && typeof window !== "undefined") {
    const refreshed = await refreshBrowserAccessToken();
    if (refreshed) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${refreshed}`);
      res = await fetch(url, { ...fetchInit, headers: retryHeaders });
    }
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ApiError>;
    throw Object.assign(
      new Error(err.message ?? `Request failed: ${res.status}`),
      { statusCode: res.status, code: err.code, details: err.details },
    );
  }

  if (res.status === 204) return undefined as T;
  // Some Nest endpoints return null from a controller — Express then sends
  // a 200 with an empty body, which `res.json()` chokes on with
  // "Unexpected end of JSON input". Read as text, then JSON.parse if the
  // body is non-empty; otherwise return undefined so consumers can treat
  // it as "no data".
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// Multipart upload — same auth pipeline (explicit token, browser refresh on
// 401) but lets the browser set Content-Type with the multipart boundary.
async function requestMultipart<T>(
  path: string,
  body: FormData,
  accessToken?: string,
): Promise<T> {
  const headers = new Headers();
  const explicitToken = accessToken;
  const tokenToUse = explicitToken ?? (await getBrowserAccessToken());
  if (tokenToUse) headers.set("Authorization", `Bearer ${tokenToUse}`);

  const url = `${baseUrl}${path}`;
  let res = await fetch(url, { method: "POST", body, headers });
  if (
    res.status === 401 &&
    explicitToken === undefined &&
    typeof window !== "undefined"
  ) {
    const refreshed = await refreshBrowserAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      res = await fetch(url, { method: "POST", body, headers });
    }
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ApiError>;
    throw Object.assign(
      new Error(err.message ?? `Upload failed: ${res.status}`),
      { statusCode: res.status, code: err.code, details: err.details },
    );
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
      // FR-TH-02: per-submission detail. Each call audit-logs the passbook
      // read server-side, so callers should fetch this on landing — not
      // poll. Signed URLs in the response expire in 5 minutes.
      kycById: (id: string) =>
        request<AdminKycDetail>(API_PATHS.adminKycById(id), {}, token),
      reviewKyc: (id: string, decision: KycReviewDecision, reason?: string) =>
        request<{ id: string; status: string }>(
          API_PATHS.adminReviewKyc(id),
          { method: "POST", body: JSON.stringify({ decision, reason }) },
          token,
        ),
      tutorPassbook: (tutorId: string) =>
        request<AdminPassbookView | null>(
          API_PATHS.adminTutorPassbook(tutorId),
          {},
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
      payoutById: (id: string) =>
        request<AdminPayoutDetail>(API_PATHS.adminPayoutById(id), {}, token),
      computePayouts: (dto: ComputePayoutsDto) =>
        request<AdminPayoutRow[]>(
          API_PATHS.adminComputePayouts,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      payoutQueue: () =>
        request<AdminPayoutQueueGroup[]>(
          API_PATHS.adminPayoutQueue,
          {},
          token,
        ),
      generatePayoutBatch: (dto: GeneratePayoutBatchDto) =>
        request<{ count: number }>(
          API_PATHS.adminGeneratePayoutBatch,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      markPayoutTransferred: (id: string, dto: MarkPayoutTransferredDto) =>
        request<AdminPayoutRow>(
          API_PATHS.adminMarkPayoutTransferred(id),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      failPayout: (id: string, dto: FailPayoutDto) =>
        request<AdminPayoutRow>(
          API_PATHS.adminFailPayout(id),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      // FR-TC-02: admin editorial seeding via CSV/xlsx (manual upload only).
      tcas: {
        previewCriteria: (file: File) => {
          const fd = new FormData();
          fd.append("file", file, file.name);
          return requestMultipart<TcasCriteriaPreviewResponse>(
            API_PATHS.adminTcasCriteriaPreview,
            fd,
            token,
          );
        },
        commitCriteria: (uploadId: string) =>
          request<TcasCommitResult>(
            API_PATHS.adminTcasCriteriaCommit,
            { method: "POST", body: JSON.stringify({ uploadId }) },
            token,
          ),
        listImports: () =>
          request<TcasImportAuditEntry[]>(
            API_PATHS.adminTcasImports,
            {},
            token,
          ),
        examCatalogue: () =>
          request<TcasExamCatalogueEntry[]>(
            API_PATHS.adminTcasExamCatalogue,
            {},
            token,
          ),
      },
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
      availability: (id: string, fromIso: string, toIso: string) =>
        request<AvailabilityResult>(
          `${API_PATHS.tutorAvailability(id)}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
          {},
          token,
        ),
      unavailability: {
        list: () =>
          request<TutorUnavailability[]>(
            API_PATHS.tutorMyUnavailability,
            {},
            token,
          ),
        create: (dto: CreateUnavailabilityDto) =>
          request<TutorUnavailability>(
            API_PATHS.tutorMyUnavailability,
            { method: "POST", body: JSON.stringify(dto) },
            token,
          ),
        remove: (id: string) =>
          request<void>(
            API_PATHS.tutorMyUnavailabilityById(id),
            { method: "DELETE" },
            token,
          ),
      },
      // FR-TH-02: tutor bank-info edit. getMyBank returns null when the
      // tutor has not finished KYC yet; the page redirects accordingly.
      bank: {
        // Nest may send an empty 200 body when the controller returns null
        // (Express + JSON.stringify quirks); the request() helper turns
        // that into undefined. Normalize to null so consumers can typecheck
        // on `MaskedBankInfo | null` without an extra | undefined.
        get: async () =>
          (await request<MaskedBankInfo | null>(
            API_PATHS.tutorMyBank,
            {},
            token,
          )) ?? null,
        update: (dto: UpdateBankDto) =>
          request<MaskedBankInfo>(
            API_PATHS.tutorMyBank,
            { method: "PATCH", body: JSON.stringify(dto) },
            token,
          ),
      },
    },
    bookings: {
      create: (dto: CreateBookingDto) =>
        request<Booking>(
          API_PATHS.bookings,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      mine: () => request<Booking[]>(API_PATHS.bookings, {}, token),
      byId: (id: string) => request<Booking>(API_PATHS.bookingById(id), {}, token),
      mineBusy: (fromIso: string, toIso: string) =>
        request<AvailabilityResult>(
          `${API_PATHS.bookingsMineBusy}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
          {},
          token,
        ),
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
      postpone: {
        initiate: (id: string, dto: PostponeRequestDto) =>
          request<PostponeOpenResult>(
            API_PATHS.postponeBooking(id),
            { method: "POST", body: JSON.stringify(dto) },
            token,
          ),
        propose: (id: string, dto: ProposeSlotDto) =>
          request<{ ok: true }>(
            API_PATHS.postponePropose(id),
            { method: "POST", body: JSON.stringify(dto) },
            token,
          ),
        confirm: (id: string) =>
          request<PostponeConfirmResult>(
            API_PATHS.postponeConfirm(id),
            { method: "POST" },
            token,
          ),
        cancel: (id: string) =>
          request<{ ok: true }>(
            API_PATHS.postponeCancel(id),
            { method: "POST" },
            token,
          ),
      },
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
    auth: {
      // FR-TH-17 rev3: tutor's Google connect / disconnect / status surface.
      googleConnect: () =>
        request<{ authorizationUrl: string }>(
          API_PATHS.authGoogleConnect,
          { method: "POST" },
          token,
        ),
      googleDisconnect: () =>
        request<{ connected: false }>(
          API_PATHS.authGoogleDisconnect,
          { method: "POST" },
          token,
        ),
      googleStatus: () =>
        request<{ connected: boolean; email?: string; connectedAt?: string }>(
          API_PATHS.authGoogleStatus,
          {},
          token,
        ),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
