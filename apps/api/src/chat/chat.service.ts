import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ChatMessage, ChatThread } from "@peerahat/types";

import { BypassFilterService } from "../common/bypass-filter.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filter: BypassFilterService,
  ) {}

  async threadsForUser(supabaseId: string): Promise<ChatThread[]> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) return [];
    const rows = await this.prisma.chatThread.findMany({
      where: {
        OR: [{ studentId: user.id }, { tutor: { userId: user.id } }],
      },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        student: true,
        tutor: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      rows.map(async (t) => {
        const isStudentSide = t.studentId === user.id;
        const counterparty = isStudentSide
          ? {
              displayName: t.tutor.user.displayName,
              avatarUrl: t.tutor.user.avatarUrl ?? undefined,
              role: "tutor" as const,
              tutorId: t.tutorId,
              subtitle: `${t.tutor.faculty} • ${t.tutor.university}`,
            }
          : {
              displayName: t.student.displayName,
              avatarUrl: t.student.avatarUrl ?? undefined,
              role: "student" as const,
            };
        const lastReadAt = isStudentSide
          ? t.studentLastReadAt
          : t.tutorLastReadAt;
        const unreadCount = await this.unreadCountFor(
          t.id,
          user.id,
          lastReadAt,
        );
        return {
          id: t.id,
          studentId: t.studentId,
          tutorId: t.tutorId,
          bookingId: t.bookingId ?? undefined,
          lastMessagePreview: t.messages[0]?.body ?? "",
          lastMessageAt:
            t.messages[0]?.createdAt.toISOString() ??
            t.createdAt.toISOString(),
          counterparty,
          viewerUserId: user.id,
          unreadCount,
        };
      }),
    );
  }

  /**
   * Update the calling viewer's last-read timestamp on the thread. Idempotent:
   * advancing to a later timestamp is always safe; we don't go backwards.
   * Called from the chat room on mount + after each new message arrives.
   */
  async markRead(supabaseId: string, threadId: string): Promise<void> {
    const { user, thread } = await this.assertParticipant(supabaseId, threadId);
    const isStudentSide = thread.studentId === user.id;
    await this.prisma.chatThread.update({
      where: { id: thread.id },
      data: isStudentSide
        ? { studentLastReadAt: new Date() }
        : { tutorLastReadAt: new Date() },
    });
  }

  private async unreadCountFor(
    threadId: string,
    viewerUserId: string,
    lastReadAt: Date | null,
  ): Promise<number> {
    return this.prisma.chatMessage.count({
      where: {
        threadId,
        authorId: { not: viewerUserId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });
  }

  /**
   * Resolve a thread by its primary id. Used by /chat/thread/[threadId]
   * which works for either side of the conversation (tutor or student).
   */
  async threadById(supabaseId: string, threadId: string): Promise<ChatThread> {
    const { user, thread } = await this.assertParticipant(supabaseId, threadId);
    const full = await this.prisma.chatThread.findUniqueOrThrow({
      where: { id: thread.id },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        student: true,
        tutor: { include: { user: true } },
      },
    });
    const isStudentSide = full.studentId === user.id;
    const counterparty = isStudentSide
      ? {
          displayName: full.tutor.user.displayName,
          avatarUrl: full.tutor.user.avatarUrl ?? undefined,
          role: "tutor" as const,
          tutorId: full.tutorId,
          subtitle: `${full.tutor.faculty} • ${full.tutor.university}`,
        }
      : {
          displayName: full.student.displayName,
          avatarUrl: full.student.avatarUrl ?? undefined,
          role: "student" as const,
        };
    const lastReadAt = isStudentSide
      ? full.studentLastReadAt
      : full.tutorLastReadAt;
    const unreadCount = await this.unreadCountFor(full.id, user.id, lastReadAt);
    return {
      id: full.id,
      studentId: full.studentId,
      tutorId: full.tutorId,
      bookingId: full.bookingId ?? undefined,
      lastMessagePreview: full.messages[0]?.body ?? "",
      lastMessageAt:
        full.messages[0]?.createdAt.toISOString() ??
        full.createdAt.toISOString(),
      counterparty,
      viewerUserId: user.id,
      unreadCount,
    };
  }

  /**
   * Resolve the canonical thread between the calling user (as student) and the
   * given tutor profile, creating one if it does not exist. Used by
   * /chat/[tutorId] entry-points from tutor-card and the profile page.
   */
  async openWithTutor(
    supabaseId: string,
    tutorId: string,
  ): Promise<ChatThread> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: { user: true },
    });
    if (!tutor) throw new NotFoundException();
    if (tutor.userId === user.id) {
      throw new ForbiddenException("ไม่สามารถแชทกับตัวเองได้");
    }
    const counterparty = {
      displayName: tutor.user.displayName,
      avatarUrl: tutor.user.avatarUrl ?? undefined,
      role: "tutor" as const,
      tutorId,
      subtitle: `${tutor.faculty} • ${tutor.university}`,
    };
    const existing = await this.prisma.chatThread.findFirst({
      where: { studentId: user.id, tutorId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (existing) {
      const unreadCount = await this.unreadCountFor(
        existing.id,
        user.id,
        existing.studentLastReadAt,
      );
      return {
        id: existing.id,
        studentId: existing.studentId,
        tutorId: existing.tutorId,
        bookingId: existing.bookingId ?? undefined,
        lastMessagePreview: existing.messages[0]?.body ?? "",
        lastMessageAt:
          existing.messages[0]?.createdAt.toISOString() ??
          existing.createdAt.toISOString(),
        counterparty,
        viewerUserId: user.id,
        unreadCount,
      };
    }
    const created = await this.prisma.chatThread.create({
      data: { studentId: user.id, tutorId },
    });
    return {
      id: created.id,
      studentId: created.studentId,
      tutorId: created.tutorId,
      bookingId: created.bookingId ?? undefined,
      lastMessagePreview: "",
      lastMessageAt: created.createdAt.toISOString(),
      counterparty,
      viewerUserId: user.id,
      unreadCount: 0,
    };
  }

  async messages(supabaseId: string, threadId: string): Promise<ChatMessage[]> {
    await this.assertParticipant(supabaseId, threadId);
    const rows = await this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      authorId: m.authorId,
      body: m.body,
      redacted: m.redacted,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async send(
    supabaseId: string,
    threadId: string,
    rawBody: string,
  ): Promise<ChatMessage> {
    const { user } = await this.assertParticipant(supabaseId, threadId);
    const filtered = this.filter.filter(rawBody);
    const created = await this.prisma.chatMessage.create({
      data: {
        threadId,
        authorId: user.id,
        body: filtered.body,
        redacted: filtered.redacted,
      },
    });
    return {
      id: created.id,
      threadId: created.threadId,
      authorId: created.authorId,
      body: created.body,
      redacted: created.redacted,
      createdAt: created.createdAt.toISOString(),
    };
  }

  private async assertParticipant(supabaseId: string, threadId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { tutor: true },
    });
    if (!thread) throw new NotFoundException();
    if (thread.studentId !== user.id && thread.tutor.userId !== user.id) {
      throw new ForbiddenException();
    }
    return { user, thread };
  }
}
