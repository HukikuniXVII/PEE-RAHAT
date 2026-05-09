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
    return rows.map((t) => {
      const isStudentSide = t.studentId === user.id;
      const counterparty = isStudentSide
        ? {
            displayName: t.tutor.user.displayName,
            avatarUrl: t.tutor.user.avatarUrl ?? undefined,
            role: "tutor" as const,
            tutorId: t.tutorId,
          }
        : {
            displayName: t.student.displayName,
            avatarUrl: t.student.avatarUrl ?? undefined,
            role: "student" as const,
          };
      return {
        id: t.id,
        studentId: t.studentId,
        tutorId: t.tutorId,
        bookingId: t.bookingId ?? undefined,
        lastMessagePreview: t.messages[0]?.body ?? "",
        lastMessageAt:
          t.messages[0]?.createdAt.toISOString() ?? t.createdAt.toISOString(),
        counterparty,
      };
    });
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
      throw new BadRequestException("Cannot open a chat with yourself");
    }
    const counterparty = {
      displayName: tutor.user.displayName,
      avatarUrl: tutor.user.avatarUrl ?? undefined,
      role: "tutor" as const,
      tutorId,
    };
    const existing = await this.prisma.chatThread.findFirst({
      where: { studentId: user.id, tutorId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (existing) {
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
