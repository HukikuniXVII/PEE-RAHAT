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
    // FR-TH-18: query by ChatThreadParticipant.userId. The step-1 migration
    // backfilled junction rows for every existing 1-on-1 thread, so this
    // covers both 1-on-1 and group threads in one shape.
    const rows = await this.prisma.chatThread.findMany({
      where: {
        participants: { some: { userId: user.id } },
      },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        student: true,
        tutor: { include: { user: true } },
        participants: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      rows.map(async (t) => {
        const lastMessagePreview = t.messages[0]?.body ?? "";
        const lastMessageAt =
          t.messages[0]?.createdAt.toISOString() ?? t.createdAt.toISOString();

        if (t.sessionType === "group") {
          const me = t.participants.find((p) => p.userId === user.id);
          const unreadCount = await this.unreadCountFor(
            t.id,
            user.id,
            me?.lastReadAt ?? null,
          );
          // Group threads have no single "counterparty"; the UI renders
          // the members list from `participants`. We still populate a
          // placeholder counterparty (tutor-shaped) so existing list
          // components that index it don't crash.
          return {
            id: t.id,
            studentId: null,
            tutorId: t.tutorId,
            bookingId: t.bookingId ?? undefined,
            sessionType: "group" as const,
            lastMessagePreview,
            lastMessageAt,
            counterparty: {
              displayName: t.tutor.user.displayName,
              avatarUrl: t.tutor.user.avatarUrl ?? undefined,
              role: "tutor" as const,
              tutorId: t.tutorId,
              subtitle: `Group • ${t.participants.length} members`,
            },
            participants: t.participants.map((p) => ({
              userId: p.userId,
              displayName: p.user.displayName,
              avatarUrl: p.user.avatarUrl ?? undefined,
              role: (p.userId === t.tutor.userId ? "tutor" : "student") as
                | "student"
                | "tutor",
            })),
            viewerUserId: user.id,
            unreadCount,
          };
        }

        // 1-on-1: the existing student/tutor flow.
        const studentId = t.studentId!;
        const student = t.student!;
        const isStudentSide = studentId === user.id;
        const counterparty = isStudentSide
          ? {
              displayName: t.tutor.user.displayName,
              avatarUrl: t.tutor.user.avatarUrl ?? undefined,
              role: "tutor" as const,
              tutorId: t.tutorId,
              subtitle: `${t.tutor.faculty} • ${t.tutor.university}`,
            }
          : {
              displayName: student.displayName,
              avatarUrl: student.avatarUrl ?? undefined,
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
          studentId,
          tutorId: t.tutorId,
          bookingId: t.bookingId ?? undefined,
          sessionType: "one_on_one" as const,
          lastMessagePreview,
          lastMessageAt,
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
    if (thread.sessionType === "group") {
      // FR-TH-18: group threads track per-user last-read on the junction.
      await this.prisma.chatThreadParticipant.update({
        where: {
          threadId_userId: { threadId: thread.id, userId: user.id },
        },
        data: { lastReadAt: new Date() },
      });
      return;
    }
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
    // FR-TH-18: see threadsForUser — Step 9 widens this for group threads.
    const studentId = full.studentId!;
    const student = full.student!;
    const isStudentSide = studentId === user.id;
    const counterparty = isStudentSide
      ? {
          displayName: full.tutor.user.displayName,
          avatarUrl: full.tutor.user.avatarUrl ?? undefined,
          role: "tutor" as const,
          tutorId: full.tutorId,
          subtitle: `${full.tutor.faculty} • ${full.tutor.university}`,
        }
      : {
          displayName: student.displayName,
          avatarUrl: student.avatarUrl ?? undefined,
          role: "student" as const,
        };
    const lastReadAt = isStudentSide
      ? full.studentLastReadAt
      : full.tutorLastReadAt;
    const unreadCount = await this.unreadCountFor(full.id, user.id, lastReadAt);
    return {
      id: full.id,
      studentId,
      tutorId: full.tutorId,
      bookingId: full.bookingId ?? undefined,
      lastMessagePreview: full.messages[0]?.body ?? "",
      lastMessageAt:
        full.messages[0]?.createdAt.toISOString() ??
        full.createdAt.toISOString(),
      counterparty,
      viewerUserId: user.id,
      unreadCount,
      closedAt: full.closedAt?.toISOString() ?? undefined,
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
        // FR-TH-18: studentId is non-null for this 1-on-1 lookup —
        // the WHERE clause matched on student.id, so it can't be null.
        id: existing.id,
        studentId: existing.studentId!,
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
      studentId: created.studentId!,
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
      kind: m.kind,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async send(
    supabaseId: string,
    threadId: string,
    rawBody: string,
  ): Promise<ChatMessage> {
    const { user, thread } = await this.assertParticipant(supabaseId, threadId);
    if (thread.closedAt) {
      throw new ForbiddenException("Thread is closed — cannot send messages");
    }
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

  // ── Postpone-class helpers (FR-TH-10..13) ──────────────────────────────
  //
  // The negotiation uses the booking pair's existing thread; closedAt is
  // a per-negotiation flag and gets cleared when a fresh request reopens.

  async ensureThreadForBooking(bookingId: string): Promise<{ id: string }> {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { id: true, studentId: true, tutorId: true },
    });
    const existing = await this.prisma.chatThread.findFirst({
      where: { studentId: booking.studentId, tutorId: booking.tutorId },
      select: { id: true, bookingId: true, closedAt: true },
    });
    if (existing) {
      if (existing.closedAt || existing.bookingId !== bookingId) {
        await this.prisma.chatThread.update({
          where: { id: existing.id },
          data: {
            closedAt: null,
            ...(existing.bookingId ? {} : { bookingId }),
          },
        });
      }
      return { id: existing.id };
    }
    const created = await this.prisma.chatThread.create({
      data: {
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        bookingId,
      },
      select: { id: true },
    });
    return created;
  }

  async postSystemMessage(
    threadId: string,
    body: string,
    actorUserId: string,
  ): Promise<void> {
    await this.prisma.chatMessage.create({
      data: {
        threadId,
        authorId: actorUserId,
        body,
        kind: "system",
      },
    });
  }

  async closeThread(threadId: string): Promise<void> {
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { closedAt: new Date() },
    });
  }

  async counterpartyHasMessagedSince(
    threadId: string,
    counterpartyUserId: string,
    since: Date,
  ): Promise<boolean> {
    const hit = await this.prisma.chatMessage.findFirst({
      where: {
        threadId,
        authorId: counterpartyUserId,
        kind: "user",
        createdAt: { gt: since },
      },
      select: { id: true },
    });
    return hit !== null;
  }

  private async assertParticipant(supabaseId: string, threadId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        tutor: true,
        participants: { where: { userId: user.id }, select: { id: true } },
      },
    });
    if (!thread) throw new NotFoundException();
    // FR-TH-18: junction membership is authoritative — works for both
    // 1-on-1 (backfilled by the step-1 migration) and group threads.
    // The legacy studentId/tutor.userId fallback stays as defence in
    // depth in case the backfill row was lost.
    const viaJunction = thread.participants.length > 0;
    const viaLegacy =
      thread.studentId === user.id || thread.tutor.userId === user.id;
    if (!viaJunction && !viaLegacy) throw new ForbiddenException();
    return { user, thread };
  }

  /**
   * FR-TH-18: idempotent. Creates a group ChatThread for a confirmed group
   * booking, with ChatThreadParticipant rows for the host, every paid
   * invitee, and the tutor's User. Returns the thread id so the caller
   * (GroupSessionService.confirmGroup) can pass it through to attachToBooking
   * → postLinkMessage.
   */
  async createGroupThread(bookingId: string): Promise<{ id: string }> {
    const existing = await this.prisma.chatThread.findFirst({
      where: { bookingId },
      select: { id: true },
    });
    if (existing) return existing;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: { select: { userId: true } },
        participants: {
          where: { status: "paid" },
          select: { studentId: true },
        },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.sessionType !== "group") {
      throw new BadRequestException(
        "createGroupThread called on a 1-on-1 booking",
      );
    }

    // Deduplicate just in case (host email collides with tutor email, etc.).
    const userIds = Array.from(
      new Set([
        booking.tutor.userId,
        ...booking.participants.map((p) => p.studentId),
      ]),
    );

    const created = await this.prisma.chatThread.create({
      data: {
        // studentId null distinguishes group threads from 1-on-1 ones at
        // the column level. Postgres treats NULL as distinct in unique
        // constraints, so multiple group rows (null, tutorId) coexist.
        studentId: null,
        tutorId: booking.tutorId,
        bookingId,
        sessionType: "group",
        participants: {
          create: userIds.map((userId) => ({ userId })),
        },
      },
      select: { id: true },
    });
    return created;
  }
}
