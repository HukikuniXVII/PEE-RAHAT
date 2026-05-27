import { z } from "zod";

export interface CommunityPost {
  id: string;
  authorId: string;
  authorDisplayName: string;
  authorBadge: string;
  title: string;
  content: string;
  upvotes: number;
  hasUpvoted: boolean;
  replyCount: number;
  createdAt: string;
  // V2 community: per-viewer bookmark state + aggregate count.
  // Bookmark count is denormalized at read time (COUNT join), not stored.
  hasBookmarked: boolean;
  bookmarkCount: number;
}

// V2 community trending: aggregated hashtag mentions over a recent window
// (last 7 days). Parsed server-side from post title + content. No schema
// change required.
export interface TrendingTag {
  tag: string;           // includes leading "#"
  count: number;         // total posts mentioning the tag in the window
  category: string;      // human label e.g. "เทรนด์ในชุมชน"
}

// Shared hashtag definition: 2–40 Unicode word chars after a "#". Used by
// the trending aggregator (server), the body renderer (post card), and
// the in-card tag chip — keeping one source so all three stay in sync if
// the rule changes.
//
// `HASHTAG_RE_GLOBAL` is the global variant for matchAll / split — DO NOT
// mutate its lastIndex from multiple call sites (always use matchAll/split
// which create independent iterators). Use `HASHTAG_RE_FIRST` for single
// "give me the first tag" queries.
export const HASHTAG_RE_GLOBAL = /#[\p{L}\p{N}_-]{2,40}/gu;
export const HASHTAG_RE_FIRST = /#[\p{L}\p{N}_-]{2,40}/u;
// Capture-group variant: for trending aggregation where we want the tag
// body WITHOUT the leading "#". Same shape as the others.
export const HASHTAG_RE_GLOBAL_CAPTURE = /#([\p{L}\p{N}_-]{2,40})/gu;
// Split variant: capture group includes the "#" so String#split keeps
// matched tags as full "#tag" tokens interleaved with the text. Use this
// when rendering a body with tags highlighted; consumers should NOT
// reconstruct this from HASHTAG_RE_GLOBAL.source at runtime.
export const HASHTAG_RE_GLOBAL_SPLIT = /(#[\p{L}\p{N}_-]{2,40})/gu;

/** First hashtag in a string, or null. Returns the full "#tag" form. */
export function firstHashtag(text: string): string | null {
  const m = text.match(HASHTAG_RE_FIRST);
  return m ? m[0] : null;
}

// V2 community mini-profile overlay. Discriminated by `mode` so the
// frontend renders the right body without a separate endpoint per kind.
// Fields are deliberately limited to data that exists in the DB today
// or is computable from existing tables — no new schema columns.

export interface MiniProfileSubject {
  userId: string;
  name: string;            // displayName
  avatarUrl: string | null;
  verified: boolean;       // true iff the user has a TutorProfile and isVerified
}

export interface StudentMiniProfile {
  mode: "student";
  subject: MiniProfileSubject;
  stats: {
    posts: number;
    comments: number;
    bookmarks: number;
  };
  recentPosts: Array<{
    id: string;
    tag: string | null;    // first hashtag in body, if any
    body: string;          // truncated by the renderer, not here
    createdAt: string;     // ISO
  }>;
  joinedAt: string;        // ISO — overlay formats as "X เดือนก่อน"
}

export interface TutorMiniProfileReview {
  id: string;
  studentDisplayName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string;
}

export interface TutorMiniProfileTopSheet {
  id: string;
  title: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  priceThb: number;
}

export interface TutorMiniProfile {
  mode: "tutor";
  subject: MiniProfileSubject;
  uniLine: string;         // e.g. "จุฬาฯ วิศวกรรมศาสตร์" (no year — not in DB)
  stats: {
    rating: number;
    hoursTaught: number;   // sum of completed booking minutes / 60, rounded
    studentsTaught: number;
    totalReviews: number;
  };
  hourlyRate: number;
  bio: string;
  subjectsTaught: string[];  // raw Subject codes; UI maps via SUBJECT_LABELS
  reviews: TutorMiniProfileReview[];   // top 3 by createdAt desc
  // First-character initials only — exposing full student displayNames
  // on a public endpoint is a PDPA concern (completing a booking is
  // not consent-to-publish like reviewing is). The frontend renders
  // these in colored avatar chips identical to the rest of the UI.
  pastStudentInitials: string[];       // up to 5 distinct initials
  otherStudentsCount: number;          // studentsTaught - returned initials length
  topSheet: TutorMiniProfileTopSheet | null;
  joinedAt: string;
}

export type MiniProfile = StudentMiniProfile | TutorMiniProfile;

export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorBadge: string;
  content: string;
  createdAt: string;
}

export const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10_000),
  consentPdpaAccepted: z.boolean().refine((v) => v === true, {
    message: "PDPA consent required",
  }),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;

export const createReplySchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(1).max(10_000),
});

export type CreateReplyDto = z.infer<typeof createReplySchema>;

export const reportTargetTypeSchema = z.enum([
  "post",
  "reply",
  "sheet",
  "tutor",
  "message",
  "booking",
]);

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

export const reportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: z.string().min(1),
  details: z.string().min(1).max(2000),
});

export type ReportDto = z.infer<typeof reportSchema>;
