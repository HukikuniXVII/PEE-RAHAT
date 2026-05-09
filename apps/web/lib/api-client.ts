import {
  API_PATHS,
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
  type KycSubmitDto,
  type KycSubmission,
  type KycUploadIntent,
  type Page,
  type PaymentIntent,
  type QuizQuestion,
  type QuizResult,
  type QuizSubmissionDto,
  type ReportDto,
  type SendMessageDto,
  type SheetReportDto,
  type SlipVerificationResult,
  type StudySheet,
  type Subject,
  type TcasDeadline,
  type TcasProgram,
  type TcasWhatIfRequest,
  type TcasWhatIfResult,
  type Tutor,
  type TutorReview,
  type TutorSearchQuery,
  type TutorSearchResult,
  type UploadSlipDto,
} from "@peerahat/types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

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
    tutors: {
      search: (q: TutorSearchQuery) =>
        request<TutorSearchResult>(`${API_PATHS.tutors}${qs(q)}`, {}, token),
      byId: (id: string) =>
        request<Tutor>(API_PATHS.tutorById(id), {}, token),
      reviews: (id: string) =>
        request<Page<TutorReview>>(API_PATHS.tutorReviews(id), {}, token),
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
      list: (subject?: Subject, q?: string) =>
        request<Page<StudySheet>>(
          `${API_PATHS.sheets}${qs({ subject, q })}`,
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
      replies: (postId: string) =>
        request<CommunityReply[]>(API_PATHS.postReplies(postId), {}, token),
      reply: (dto: CreateReplyDto) =>
        request<CommunityReply>(
          API_PATHS.postReplies(dto.postId),
          { method: "POST", body: JSON.stringify(dto) },
          token,
        ),
    },
    quiz: {
      questions: (subject: Subject) =>
        request<QuizQuestion[]>(
          `${API_PATHS.quizQuestions}${qs({ subject })}`,
          {},
          token,
        ),
      submit: (dto: QuizSubmissionDto) =>
        request<QuizResult>(
          API_PATHS.quizSubmit,
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
