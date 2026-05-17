import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CommunityPost,
  CommunityReply,
  CreatePostDto,
  Page,
  ReportDto,
} from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1): Promise<Page<CommunityPost>> {
    const pageSize = 20;
    const [rows, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { include: { tutorProfile: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.communityPost.count({ where: { isHidden: false } }),
    ]);

    return {
      items: rows.map((r) => this.toDto(r, false)),
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
        _count: { select: { replies: true } },
      },
    });
    return this.toDto(post, false);
  }

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
      return { upvotes: updated.upvoteCount };
    }
    await this.prisma.postUpvote.create({
      data: { postId, userId: user.id },
    });
    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: { upvoteCount: { increment: 1 } },
    });
    return { upvotes: updated.upvoteCount };
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
        where: { postId },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { author: { include: { tutorProfile: true } } },
      }),
      this.prisma.communityReply.count({ where: { postId } }),
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

  async report(supabaseId: string, dto: ReportDto) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    await this.prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
    });
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
      _count: { replies: number };
    },
    hasUpvoted: boolean,
  ): CommunityPost {
    return {
      id: post.id,
      authorId: post.authorId,
      authorDisplayName: post.author.displayName,
      authorBadge: this.badgeFor(post.author),
      title: post.title,
      content: post.content,
      upvotes: post.upvoteCount,
      hasUpvoted,
      replyCount: post._count.replies,
      createdAt: post.createdAt.toISOString(),
    };
  }

  private badgeFor(author: {
    tutorProfile: { university: string; faculty: string } | null;
  }): string {
    if (!author.tutorProfile) return "Student";
    return `${author.tutorProfile.faculty} | ${author.tutorProfile.university}`;
  }
}
