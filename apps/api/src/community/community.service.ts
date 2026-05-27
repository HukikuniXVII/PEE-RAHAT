import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  type CommunityPost,
  type CommunityReply,
  type CreatePostDto,
  type Page,
  type TrendingTag,
  HASHTAG_RE_GLOBAL_CAPTURE,
} from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

// Trending lookback window. 7 days strikes a balance between "showing
// noise from a single viral post" (too short) and "stale forever" (too
// long). Tune later if signal/noise shifts.
const TRENDING_WINDOW_DAYS = 7;

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
