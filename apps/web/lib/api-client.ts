import {
  API_PATHS,
  type AdminBankChangeItem,
  type AdminKycDetail,
  type AdminKycQueueItem,
  type AdminUserPage,
  type AdminUserRow,
  type UpdateAdminUserDto,
  type AdminPassbookView,
  type SetTutorVisibilityDto,
  type SetTutorVisibilityResult,
  type AdminPaymentRow,
  type AdminPayoutDetail,
  type AdminPayoutQueueGroup,
  type AdminPayoutRow,
  type AdminReportDetail,
  type AdminReportQueueItem,
  type AvatarUploadIntent,
  type ComputePayoutsDto,
  type FailPayoutDto,
  type GeneratePayoutBatchDto,
  type MarkPayoutTransferredDto,
  type CreateUnavailabilityDto,
  type KycReviewDecision,
  type ApiError,
  type Booking,
  type BookingParticipant,
  type BookingReportDto,
  type DeclineInviteDto,
  type InviteParticipantsDto,
  type InviteSummaryDto,
  type TutorRejectGroupDto,
  type ChatBookingProposal,
  type ChatMessage,
  type ChatThread,
  type CommunityPost,
  type CommunityReply,
  type CreateBookingDto,
  type CreatePaymentIntentDto,
  type CreatePostDto,
  type CreateReplyDto,
  type MiniProfile,
  type TrendingTag,
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
  type AddReportCommentDto,
  type NotificationFeedPage,
  type NotificationPreferenceDto,
  type PushDeviceItem,
  type PushSubscriptionInput,
  type UpdateNotificationPreferenceDto,
  type VapidPublicKeyResponse,
  type CreateReportDto,
  type CreateReportResult,
  type RelatedReportItem,
  type ReportDetail,
  type ReportEventView,
  type ReportEvidenceUploadResult,
  type ReportListItem,
  type ReportPriority,
  type ReportStatus,
  type ReportTarget,
  type ResolveReportDto,
  type UpdateReportStatusDto,
  type SendMessageDto,
  type SheetReportDto,
  type SheetUploadIntent,
  type SheetUploadKind,
  type SlipRequestUploadDto,
  type SlipUploadIntent,
  type SlipVerificationResult,
  type StudySheet,
  type Subject,
  type TcasAiParseResponse,
  type TcasCommitResult,
  type TcasDeadline,
  type TcasImportAuditEntry,
  type TcasProgram,
  type TcasRound,
  type TcasRowEdits,
  type TcasWhatIfRequest,
  type TcasWhatIfResult,
  type AiUsageLogEntry,
  type AiUsageSummary,
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

// Binary fetch — mirrors request()'s auth + 401-refresh dance but returns
// the raw response Blob + content-type instead of JSON-parsing. Used by
// the admin slip-preview modal (FR-PM-01): the API proxies the slip
// bytes back to dodge cross-origin / signed-URL fragility against MinIO.
async function requestBlob(
  path: string,
  accessToken?: string,
): Promise<{ blob: Blob; contentType: string }> {
  const headers = new Headers();
  const explicitToken = accessToken;
  const tokenToUse = explicitToken ?? (await getBrowserAccessToken());
  if (tokenToUse) headers.set("Authorization", `Bearer ${tokenToUse}`);

  const url = `${baseUrl}${path}`;
  let res = await fetch(url, { headers, cache: "no-store" });
  if (
    res.status === 401 &&
    explicitToken === undefined &&
    typeof window !== "undefined"
  ) {
    const refreshed = await refreshBrowserAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      res = await fetch(url, { headers, cache: "no-store" });
    }
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ApiError>;
    throw Object.assign(
      new Error(err.message ?? `Request failed: ${res.status}`),
      { statusCode: res.status, code: err.code, details: err.details },
    );
  }
  const blob = await res.blob();
  return {
    blob,
    contentType:
      res.headers.get("content-type") ?? blob.type ?? "application/octet-stream",
  };
}

// Multipart upload — preserves the same 401-refresh path as request(). Lets
// the browser set Content-Type with the multipart boundary.
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
      reports: {
        queue: (
          opts: {
            status?: ReportStatus;
            priority?: ReportPriority;
            targetType?: ReportTarget;
            assignedToId?: string;
          } = {},
        ) =>
          request<AdminReportQueueItem[]>(
            `${API_PATHS.adminReportsQueue}${qs(opts)}`,
            {},
            token,
          ),
        overdue: () =>
          request<AdminReportQueueItem[]>(
            API_PATHS.adminReportsOverdue,
            {},
            token,
          ),
        detail: (id: string) =>
          request<AdminReportDetail>(API_PATHS.adminReportById(id), {}, token),
        related: (id: string) =>
          request<RelatedReportItem[]>(
            API_PATHS.adminReportRelated(id),
            {},
            token,
          ),
        assign: (id: string, adminId: string) =>
          request<{ ok: true }>(
            API_PATHS.adminAssignReport(id),
            { method: "PATCH", body: JSON.stringify({ adminId }) },
            token,
          ),
        updateStatus: (id: string, dto: UpdateReportStatusDto) =>
          request<{ ok: true }>(
            API_PATHS.adminReportStatus(id),
            { method: "PATCH", body: JSON.stringify(dto) },
            token,
          ),
        resolve: (id: string, dto: ResolveReportDto) =>
          request<{ ok: true }>(
            API_PATHS.adminResolveReport(id),
            { method: "POST", body: JSON.stringify(dto) },
            token,
          ),
        markDuplicate: (id: string, parentReportId: string) =>
          request<{ ok: true }>(
            API_PATHS.adminReportDuplicate(id),
            { method: "POST", body: JSON.stringify({ parentReportId }) },
            token,
          ),
        addNote: (id: string, text: string) =>
          request<{ ok: true }>(
            API_PATHS.adminReportNote(id),
            { method: "POST", body: JSON.stringify({ text }) },
            token,
          ),
      },
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
      // FR-TH-02: admin toggle for /tutors search visibility.
      setTutorVisibility: (tutorId: string, dto: SetTutorVisibilityDto) =>
        request<SetTutorVisibilityResult>(
          API_PATHS.adminTutorVisibility(tutorId),
          { method: "PATCH", body: JSON.stringify(dto) },
          token,
        ),
      paymentsQueue: (opts: { status?: "pending" | "success" | "failed" } = {}) =>
        request<AdminPaymentRow[]>(
          `${API_PATHS.adminPaymentsQueue}${qs(opts)}`,
          {},
          token,
        ),
      // FR-PM-01: fetch slip bytes via the API proxy and wrap as a blob
      // URL the modal can render in <img src>. The caller MUST call
      // URL.revokeObjectURL on close — useEffect cleanup is the easiest
      // place. Earlier rev returned a signed S3 URL but admin browsers
      // saw broken images (cross-origin / host mismatch); proxying the
      // bytes sidesteps every browser↔S3 failure mode.
      paymentSlipBlob: async (id: string) => {
        const { blob, contentType } = await requestBlob(
          API_PATHS.adminPaymentSlip(id),
          token,
        );
        return { blobUrl: URL.createObjectURL(blob), contentType };
      },
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
      // FR-TH-02 (rev): bank-change approval queue. listBankChanges
      // returns full account numbers — server audit-logs every fetch.
      bankChanges: {
        list: () =>
          request<AdminBankChangeItem[]>(
            API_PATHS.adminBankChanges,
            {},
            token,
          ),
        approve: (tutorId: string) =>
          request<AdminBankChangeItem>(
            API_PATHS.adminApproveBankChange(tutorId),
            { method: "POST" },
            token,
          ),
        reject: (tutorId: string) =>
          request<{ ok: true }>(
            API_PATHS.adminRejectBankChange(tutorId),
            { method: "POST" },
            token,
          ),
      },
      // Account-management testing tool. Audit-logged server-side.
      users: {
        list: (opts: { page?: number; pageSize?: number; q?: string } = {}) =>
          request<AdminUserPage>(
            `${API_PATHS.adminUsers}${qs(opts)}`,
            {},
            token,
          ),
        update: (id: string, dto: UpdateAdminUserDto) =>
          request<AdminUserRow>(
            API_PATHS.adminUserById(id),
            { method: "PATCH", body: JSON.stringify(dto) },
            token,
          ),
        // FR-TH-02: hard delete a user via the admin panel. Server-side
        // history gate keeps any non-clean account safe; UI surfaces
        // USER_HAS_HISTORY 400 with a hint to suspend instead.
        delete: (id: string) =>
          request<{ ok: true }>(
            API_PATHS.adminUserById(id),
            { method: "DELETE" },
            token,
          ),
      },
      // FR-TC-02: AI-powered TCAS criteria importer. parseAi sends a PDF
      // for Gemini extraction; reparse reruns against the same buffered
      // PDF with a different model; commit applies admin rowEdits and
      // writes to TcasProgram.
      tcas: {
        parseAi: (
          file: File,
          meta: {
            university: string;
            round: TcasRound;
            admissionYear: number;
            sourceUrl?: string;
            allowFallback?: boolean;
          },
        ) => {
          const fd = new FormData();
          fd.append("file", file, file.name);
          fd.append("university", meta.university);
          fd.append("round", meta.round);
          fd.append("admissionYear", String(meta.admissionYear));
          if (meta.sourceUrl) fd.append("sourceUrl", meta.sourceUrl);
          if (meta.allowFallback !== undefined) {
            fd.append("allowFallback", String(meta.allowFallback));
          }
          return requestMultipart<TcasAiParseResponse>(
            API_PATHS.adminTcasCriteriaParseAi,
            fd,
            token,
          );
        },
        reparse: (uploadId: string, model?: string) =>
          request<TcasAiParseResponse>(
            API_PATHS.adminTcasCriteriaReparse,
            {
              method: "POST",
              body: JSON.stringify({ uploadId, model }),
            },
            token,
          ),
        commit: (uploadId: string, rowEdits?: TcasRowEdits) =>
          request<TcasCommitResult>(
            API_PATHS.adminTcasCriteriaCommit,
            {
              method: "POST",
              body: JSON.stringify({ uploadId, rowEdits }),
            },
            token,
          ),
        listImports: () =>
          request<TcasImportAuditEntry[]>(
            API_PATHS.adminTcasImports,
            {},
            token,
          ),
        aiUsage: () =>
          request<{ summary: AiUsageSummary; recent: AiUsageLogEntry[] }>(
            API_PATHS.adminAiUsage,
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
      // FR-TH-06: student cancels before payment.
      cancel: (id: string) =>
        request<Booking>(
          API_PATHS.cancelBooking(id),
          { method: "POST" },
          token,
        ),
      // FR-TH-06: tutor rejects a still-requested booking.
      reject: (id: string) =>
        request<Booking>(
          API_PATHS.rejectBooking(id),
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
      // FR-TH-18: group session host + tutor surface.
      invite: (id: string, dto: InviteParticipantsDto) =>
        request<BookingParticipant[]>(
          API_PATHS.inviteToBooking(id),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      extendInvite: (id: string) =>
        request<{ inviteExpiresAt: string }>(
          API_PATHS.extendBookingInvite(id),
          { method: "POST" },
          token,
        ),
      participants: (id: string) =>
        request<BookingParticipant[]>(
          API_PATHS.bookingParticipants(id),
          {},
          token,
        ),
      groupPending: () =>
        request<Booking[]>(API_PATHS.bookingsGroupPending, {}, token),
      groupApprove: (id: string) =>
        request<BookingParticipant[]>(
          API_PATHS.bookingGroupApprove(id),
          { method: "POST" },
          token,
        ),
      groupReject: (id: string, dto: TutorRejectGroupDto) =>
        request<void>(
          API_PATHS.bookingGroupReject(id),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    // FR-TH-18: public + invitee-side invite routes. The summary GET is
    // PUBLIC so the request runs unauthenticated when called server-side
    // for the /invite/[code] landing.
    invites: {
      summary: (code: string) =>
        request<InviteSummaryDto>(API_PATHS.inviteSummary(code), {}, token),
      accept: (code: string) =>
        request<BookingParticipant>(
          API_PATHS.inviteAccept(code),
          { method: "POST" },
          token,
        ),
      decline: (code: string, dto: DeclineInviteDto) =>
        request<BookingParticipant>(
          API_PATHS.inviteDecline(code),
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
        request<{ upvotes: number; hasUpvoted: boolean }>(
          API_PATHS.upvotePost(id),
          { method: "POST" },
          token,
        ),
      toggleBookmark: (id: string) =>
        request<{ hasBookmarked: boolean; bookmarkCount: number }>(
          API_PATHS.bookmarkPost(id),
          { method: "POST" },
          token,
        ),
      myBookmarks: () =>
        request<CommunityPost[]>(API_PATHS.communityBookmarks, {}, token),
      trending: (limit?: number) =>
        request<TrendingTag[]>(
          `${API_PATHS.communityTrending}${qs({ limit })}`,
          {},
          token,
        ),
      profile: (userId: string) =>
        request<MiniProfile>(
          API_PATHS.communityProfile(userId),
          {},
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
      // FR-PM-01: signed PUT for the slip. Frontend must call this,
      // then putPresigned() with the returned uploadUrl, before calling
      // uploadSlip(). Pre-fix the payment-dialog skipped the PUT step
      // and uploadSlip got a synthetic key with no object behind it.
      requestSlipUpload: (dto: SlipRequestUploadDto) =>
        request<SlipUploadIntent>(
          API_PATHS.slipUploadIntents,
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
      // Nest controllers that return `null` send an empty 200 body, which
      // request() surfaces as `undefined` — React Query v5 rejects that
      // and prints "data is undefined" on every refetch. Coerce to an
      // explicit null so the caller's `?? null` fallback stays trivial
      // and the queryFn satisfies RQ's contract.
      proposal: async (threadId: string) =>
        (await request<ChatBookingProposal | null>(
          API_PATHS.chatThreadProposal(threadId),
          {},
          token,
        )) ?? null,
    },
    reports: {
      create: (dto: CreateReportDto) =>
        request<CreateReportResult>(
          API_PATHS.reports,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      uploadEvidence: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        return requestMultipart<ReportEvidenceUploadResult>(
          API_PATHS.reportUploadEvidence,
          form,
          token,
        );
      },
      mine: (status?: ReportStatus) =>
        request<ReportListItem[]>(
          `${API_PATHS.reportsMine}${status ? `?status=${status}` : ""}`,
          {},
          token,
        ),
      byId: (id: string) =>
        request<ReportDetail>(API_PATHS.reportById(id), {}, token),
      addComment: (id: string, dto: AddReportCommentDto) =>
        request<ReportEventView>(
          API_PATHS.reportComment(id),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    notifications: {
      /**
       * FR-CM-08 — paginated feed. The old call site that expected an
       * array still works against the new endpoint because the backend
       * lifts the cursor wrapper into `.items` on the wire; the legacy
       * `list()` helper now reads `.items` and returns the same shape
       * old call sites expect.
       */
      list: async () => {
        const page = await request<NotificationFeedPage>(
          API_PATHS.notifications,
          {},
          token,
        );
        return page.items;
      },
      listPage: (opts: { limit?: number; before?: string } = {}) =>
        request<NotificationFeedPage>(
          `${API_PATHS.notifications}${qs(opts)}`,
          {},
          token,
        ),
      unreadCount: () =>
        request<{ count: number }>(
          API_PATHS.notificationsUnreadCount,
          {},
          token,
        ),
      getPreferences: () =>
        request<NotificationPreferenceDto>(
          API_PATHS.notificationPreferences,
          {},
          token,
        ),
      updatePreferences: (dto: UpdateNotificationPreferenceDto) =>
        request<NotificationPreferenceDto>(
          API_PATHS.notificationPreferences,
          { method: "PATCH", body: JSON.stringify(dto) },
          token,
        ),
      markRead: (id: string) =>
        request<{ ok: true }>(
          API_PATHS.notificationRead(id),
          { method: "PATCH" },
          token,
        ),
      markAllRead: () =>
        request<{ ok: true }>(
          API_PATHS.notificationsReadAll,
          { method: "POST" },
          token,
        ),
    },
    push: {
      /** Public — no auth required. Returns null when WEB_PUSH_VAPID_* unset. */
      vapidPublicKey: () =>
        request<VapidPublicKeyResponse>(
          API_PATHS.pushVapidPublicKey,
          {},
          token,
        ),
      subscribe: (dto: PushSubscriptionInput) =>
        request<{ ok: true; id: string }>(
          API_PATHS.pushSubscribe,
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
      unsubscribe: (endpoint: string) =>
        request<{ ok: true }>(
          API_PATHS.pushSubscribe,
          { method: "DELETE", body: JSON.stringify({ endpoint }) },
          token,
        ),
      listDevices: () =>
        request<PushDeviceItem[]>(API_PATHS.pushDevices, {}, token),
      revokeDevice: (id: string) =>
        request<{ ok: true }>(
          API_PATHS.pushDeviceById(id),
          { method: "DELETE" },
          token,
        ),
      test: () =>
        request<{ ok: true }>(
          API_PATHS.pushTest,
          { method: "POST" },
          token,
        ),
    },
    uploads: {
      /**
       * PUT a file to a presigned URL returned by one of the
       * request*Upload endpoints. Centralised so the dev-stub guard
       * (storage.local URLs are DNS-unresolvable in local dev) and the
       * error-message shape stay consistent across every upload surface.
       *
       * Note: presigned URLs go straight to the storage backend — no
       * Authorization header, no 401-refresh path needed.
       */
      putPresigned: async (
        intent: { uploadUrl: string },
        file: File,
      ): Promise<void> => {
        const isStub = intent.uploadUrl.startsWith("https://storage.local");
        try {
          const put = await fetch(intent.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!put.ok && !isStub) {
            throw new Error(`อัปโหลดไม่สำเร็จ: ${put.status}`);
          }
        } catch (err) {
          if (!isStub) throw err;
        }
      },
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
