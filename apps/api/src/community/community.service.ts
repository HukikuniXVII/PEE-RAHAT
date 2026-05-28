import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  type CommunityPost,
  type CommunityReply,
  type CreatePostDto,
  type MiniProfile,
  type Page,
  type ReviewRating,
  type TutorMiniProfileTopSheet,
  type TrendingTag,
  HASHTAG_RE_GLOBAL_CAPTURE,
  firstHashtag,
} from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

// Trending lookback window. 7 days strikes a balance between "showing
// noise from a single viral post" (too short) and "stale forever" (too
// long). Tune later if signal/noise shifts.
const TRENDING_WINDOW_DAYS = 7;

// Mirrors the Avatar primitive on the frontend so chip colors match
// what the user sees elsewhere. Strip Thai honorific then take the first
// codepoint. Falls back to "?" only when displayName is empty.
function initialOf(displayName: string): string {
  const stripped = displayName.replace(/^พี่/, "").replace(/^น้อง/, "");
  return (stripped.slice(0, 1) || "?").toUpperCase();
}

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(supabaseId: string | null, page = 1): Promise<Page<CommunityPost>> {
    const pageSize = 20;
    const viewer = supabaseId
      ? await this.prisma.user.findUnique({ where: { supabaseId } })
      : null;

    const [rows, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { isHidden: false, removed: false },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { include: { tutorProfile: true } },
          _count: { select: { replies: true, bookmarks: true } },
        },
      }),
      this.prisma.communityPost.count({ where: { isHidden: false, removed: false } }),
    ]);

    // Personalize per-viewer state in one extra pair of queries. Both
    // are bounded by the page's row IDs so they stay O(page size).
    // Without this the heart + bookmark icons render unfilled on every
    // first paint for posts the viewer has already engaged with — the
    // optimistic update only kicks in after the next click, which then
    // double-toggles against stale state.
    const [bookmarkedIds, upvotedIds] = viewer
      ? await Promise.all([
          this.prisma.postBookmark
            .findMany({
              where: {
                userId: viewer.id,
                postId: { in: rows.map((r) => r.id) },
              },
              select: { postId: true },
            })
            .then((bs) => new Set(bs.map((b) => b.postId))),
          this.prisma.postUpvote
            .findMany({
              where: {
                userId: viewer.id,
                postId: { in: rows.map((r) => r.id) },
              },
              select: { postId: true },
            })
            .then((us) => new Set(us.map((u) => u.postId))),
        ])
      : [new Set<string>(), new Set<string>()];

    return {
      items: rows.map((r) =>
        this.toDto(r, {
          hasUpvoted: upvotedIds.has(r.id),
          hasBookmarked: bookmarkedIds.has(r.id),
        }),
      ),
      total,
      page,
      pageSize,
    };
  }

  async create(supabaseId: string, dto: CreatePostDto) {
    if (!dto.consentPdpaAccepted) throw new BadRequestException("PDPA consent required");
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: user.id,
        title: dto.title,
        content: dto.content,
        imageUrl: dto.imageUrl,
      },
      include: {
        author: { include: { tutorProfile: true } },
        _count: { select: { replies: true, bookmarks: true } },
      },
    });
    return this.toDto(post, { hasUpvoted: false, hasBookmarked: false });
  }

  // Returns BOTH the new count and the resulting `hasUpvoted` so the
  // client mutation can reconcile its optimistic state against the
  // server's authoritative answer (parity with toggleBookmark below).
  async upvote(supabaseId: string, postId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const existing = await this.prisma.postUpvote.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });
    if (existing) {
      await this.prisma.postUpvote.delete({
        where: { postId_userId: { postId, userId: user.id } },
      });
      const updated = await this.prisma.communityPost.update({
        where: { id: postId },
        data: { upvoteCount: { decrement: 1 } },
      });
      return { upvotes: updated.upvoteCount, hasUpvoted: false };
    }
    await this.prisma.postUpvote.create({
      data: { postId, userId: user.id },
    });
    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: { upvoteCount: { increment: 1 } },
    });
    return { upvotes: updated.upvoteCount, hasUpvoted: true };
  }

  // V2 community: toggle bookmark for the current user. Returns the new
  // aggregate count so the client can refresh the Saved card / counters
  // without a second round-trip.
  async toggleBookmark(supabaseId: string, postId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();

    const existing = await this.prisma.postBookmark.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    if (existing) {
      await this.prisma.postBookmark.delete({
        where: { userId_postId: { userId: user.id, postId } },
      });
    } else {
      await this.prisma.postBookmark.create({
        data: { userId: user.id, postId },
      });
    }

    const bookmarkCount = await this.prisma.postBookmark.count({ where: { postId } });
    return { hasBookmarked: !existing, bookmarkCount };
  }

  // V2 community: current user's saved posts, newest-first. Caps at 50
  // — the left-rail card shows 3, a future full Saved page can paginate
  // properly. For now, a single bounded query is enough.
  async myBookmarks(supabaseId: string): Promise<CommunityPost[]> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();

    const bookmarks = await this.prisma.postBookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        post: {
          include: {
            author: { include: { tutorProfile: true } },
            _count: { select: { replies: true, bookmarks: true } },
          },
        },
      },
    });

    return bookmarks
      .filter((b) => !b.post.isHidden && !b.post.removed)
      .map((b) =>
        this.toDto(b.post, { hasUpvoted: false, hasBookmarked: true }),
      );
  }

  // V2 community: top-N hashtags by occurrence in the trailing 7-day
  // window. Parses tags out of post title + content with a Unicode-aware
  // regex (Thai + Latin). No schema column; computed on the fly. Cheap
  // at current scale (low-thousands posts/week); migrate to a denorm
  // counter or pg_trgm if it grows.
  async trending(limit = 5): Promise<TrendingTag[]> {
    const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.communityPost.findMany({
      where: {
        isHidden: false,
        removed: false,
        createdAt: { gte: since },
      },
      select: { title: true, content: true },
    });

    const counts = new Map<string, number>();
    for (const r of rows) {
      const seenInPost = new Set<string>();
      for (const text of [r.title, r.content]) {
        for (const m of text.matchAll(HASHTAG_RE_GLOBAL_CAPTURE)) {
          const tag = `#${m[1]}`;
          if (seenInPost.has(tag)) continue;
          seenInPost.add(tag);
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({
        tag,
        count,
        category: "เทรนด์ในชุมชน",
      }));
  }

  // V2 community mini-profile overlay. Single endpoint dispatches to
  // tutor or student variant based on whether the user has a TutorProfile.
  // All data is either already in the DB or computable from existing
  // tables — no new schema. Fields that would require new columns
  // (goal/interests/year/weeklyRank/responseTime/placedUniSummary) are
  // omitted from the response so the frontend hides those sections.
  async profile(userId: string): Promise<MiniProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tutorProfile: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const subject = {
      userId: user.id,
      name: user.displayName,
      avatarUrl: user.avatarUrl,
      verified: !!user.tutorProfile?.isVerified,
    };

    if (user.tutorProfile) {
      return this.tutorProfile(user, user.tutorProfile, subject);
    }
    return this.studentProfile(user, subject);
  }

  private async studentProfile(
    user: { id: string; createdAt: Date },
    subject: MiniProfile["subject"],
  ): Promise<MiniProfile> {
    // Three counts + the latest 2 posts, fanned out in parallel so the
    // overlay opens in one round-trip.
    const [posts, comments, bookmarks, recent] = await Promise.all([
      this.prisma.communityPost.count({
        where: { authorId: user.id, isHidden: false, removed: false },
      }),
      this.prisma.communityReply.count({
        where: { authorId: user.id, removed: false },
      }),
      this.prisma.postBookmark.count({ where: { userId: user.id } }),
      this.prisma.communityPost.findMany({
        where: { authorId: user.id, isHidden: false, removed: false },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { id: true, content: true, createdAt: true },
      }),
    ]);

    return {
      mode: "student",
      subject,
      stats: { posts, comments, bookmarks },
      recentPosts: recent.map((p) => ({
        id: p.id,
        tag: firstHashtag(p.content),
        body: p.content,
        createdAt: p.createdAt.toISOString(),
      })),
      joinedAt: user.createdAt.toISOString(),
    };
  }

  private async tutorProfile(
    user: { id: string; createdAt: Date },
    tutor: {
      id: string;
      bio: string;
      university: string;
      faculty: string;
      hourlyRate: number;
      rating: number;
      reviewCount: number;
      subjects: string[];
    },
    subject: MiniProfile["subject"],
  ): Promise<MiniProfile> {
    // Top sheet: pick by sold count desc, then rating × reviewCount as
    // tiebreaker. Sold count is computed from released payments so it
    // reflects actually-fulfilled sales, not in-flight ones.
    const [reviews, completedBookings, sheets] = await Promise.all([
      this.prisma.tutorReview.findMany({
        where: { tutorId: tutor.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { student: { select: { displayName: true } } },
      }),
      this.prisma.booking.findMany({
        where: { tutorId: tutor.id, status: "completed" },
        select: {
          durationMinutes: true,
          studentId: true,
          student: { select: { displayName: true } },
        },
      }),
      this.prisma.studySheet.findMany({
        where: { sellerId: tutor.id, isSuspended: false, removed: false },
        select: {
          id: true,
          title: true,
          rating: true,
          reviewCount: true,
          priceThb: true,
        },
      }),
    ]);

    const totalMinutes = completedBookings.reduce(
      (sum, b) => sum + b.durationMinutes,
      0,
    );
    // Initials only — full names are PII and don't belong on a public
    // endpoint just because a student took a class. Strip Thai honorific
    // (mirrors the Avatar primitive on the frontend) so "พี่กิ๊ฟ" and
    // "น้องกิ๊ฟ" both reduce to "ก", keeping the chip color stable.
    const distinctInitials = new Map<string, string>();
    for (const b of completedBookings) {
      if (!distinctInitials.has(b.studentId)) {
        distinctInitials.set(b.studentId, initialOf(b.student.displayName));
      }
    }
    const allInitials = Array.from(distinctInitials.values());
    const pastStudentInitials = allInitials.slice(0, 5);
    const otherStudentsCount = Math.max(
      0,
      allInitials.length - pastStudentInitials.length,
    );

    // Top sheet selection. Single groupBy keyed on sheetId so one
    // round-trip handles any number of sheets — replaces an N+1 of
    // per-sheet COUNT queries.
    let topSheet: TutorMiniProfileTopSheet | null = null;
    if (sheets.length > 0) {
      const counts = await this.prisma.paymentIntent.groupBy({
        by: ["sheetId"],
        where: {
          sheetId: { in: sheets.map((s) => s.id) },
          status: "released_for_payout",
        },
        _count: { _all: true },
      });
      const countBySheet = new Map<string, number>();
      for (const c of counts) {
        // groupBy.by emits the field as possibly-null even when filtered
        // non-null; guard to satisfy the type checker without ?? noise.
        if (c.sheetId) countBySheet.set(c.sheetId, c._count._all);
      }
      const ranked = sheets
        .map((s) => ({ sheet: s, soldCount: countBySheet.get(s.id) ?? 0 }))
        .sort((a, b) => {
          if (b.soldCount !== a.soldCount) return b.soldCount - a.soldCount;
          return (
            b.sheet.rating * b.sheet.reviewCount -
            a.sheet.rating * a.sheet.reviewCount
          );
        });
      const top = ranked[0];
      if (top) {
        topSheet = {
          id: top.sheet.id,
          title: top.sheet.title,
          rating: top.sheet.rating,
          reviewCount: top.sheet.reviewCount,
          soldCount: top.soldCount,
          priceThb: top.sheet.priceThb,
        };
      }
    }

    return {
      mode: "tutor",
      subject,
      uniLine: `${tutor.university} ${tutor.faculty}`,
      stats: {
        rating: tutor.rating,
        hoursTaught: Math.round(totalMinutes / 60),
        studentsTaught: allInitials.length,
        totalReviews: tutor.reviewCount,
      },
      hourlyRate: tutor.hourlyRate,
      bio: tutor.bio,
      subjectsTaught: tutor.subjects,
      reviews: reviews.map((r) => ({
        id: r.id,
        studentDisplayName: r.student.displayName,
        rating: r.rating as ReviewRating,
        text: r.text,
        createdAt: r.createdAt.toISOString(),
      })),
      pastStudentInitials,
      otherStudentsCount,
      topSheet,
      joinedAt: user.createdAt.toISOString(),
    };
  }

  async replies(
    postId: string,
    pageInput?: number,
    pageSizeInput?: number,
  ): Promise<{
    items: CommunityReply[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, pageInput ?? 1);
    const pageSize = Math.min(50, Math.max(1, pageSizeInput ?? 10));
    const [rows, total] = await Promise.all([
      this.prisma.communityReply.findMany({
        where: { postId, removed: false },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { author: { include: { tutorProfile: true } } },
      }),
      this.prisma.communityReply.count({ where: { postId, removed: false } }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        postId: r.postId,
        authorId: r.authorId,
        authorDisplayName: r.author.displayName,
        authorBadge: this.badgeFor(r.author),
        content: r.content,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async reply(supabaseId: string, postId: string, content: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    const reply = await this.prisma.communityReply.create({
      data: { postId, authorId: user.id, content },
      include: { author: { include: { tutorProfile: true } } },
    });
    return {
      id: reply.id,
      postId: reply.postId,
      authorId: reply.authorId,
      authorDisplayName: reply.author.displayName,
      authorBadge: this.badgeFor(reply.author),
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
    };
  }

  private toDto(
    post: {
      id: string;
      authorId: string;
      title: string;
      content: string;
      imageUrl: string | null;
      upvoteCount: number;
      createdAt: Date;
      author: { displayName: string; tutorProfile: { university: string; faculty: string } | null };
      _count: { replies: number; bookmarks: number };
    },
    state: { hasUpvoted: boolean; hasBookmarked: boolean },
  ): CommunityPost {
    return {
      id: post.id,
      authorId: post.authorId,
      authorDisplayName: post.author.displayName,
      authorBadge: this.badgeFor(post.author),
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl ?? undefined,
      upvotes: post.upvoteCount,
      hasUpvoted: state.hasUpvoted,
      replyCount: post._count.replies,
      createdAt: post.createdAt.toISOString(),
      hasBookmarked: state.hasBookmarked,
      bookmarkCount: post._count.bookmarks,
    };
  }

  private badgeFor(author: {
    tutorProfile: { university: string; faculty: string } | null;
  }): string {
    if (!author.tutorProfile) return "Student";
    return `${author.tutorProfile.faculty} | ${author.tutorProfile.university}`;
  }
}
