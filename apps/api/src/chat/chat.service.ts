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
      },
    });
    return rows.map((t) => ({
      id: t.id,
      studentId: t.studentId,
      tutorId: t.tutorId,
      bookingId: t.bookingId ?? undefined,
      lastMessagePreview: t.messages[0]?.body ?? "",
      lastMessageAt:
        t.messages[0]?.createdAt.toISOString() ?? t.createdAt.toISOString(),
    }));
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
