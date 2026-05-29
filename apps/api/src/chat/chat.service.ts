import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ChatBookingProposal,
  ChatMessage,
  ChatThread,
  ChatThreadBookingSummary,
} from "@peerahat/types";

import { BypassFilterService } from "../common/bypass-filter.service";
import { SseGateway } from "../notifications/sse.gateway";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filter: BypassFilterService,
    private readonly sse: SseGateway,
  ) {}

  /**
   * FR-CM-08 rev2: fan SSE cache-invalidation events at every member
   * of a chat thread so a new message lands on every open tab without
   * the 5s/30s polls the chat-room/threads-list used to do. Computes
   * the audience from ChatThreadParticipant (group threads) with a
   * fallback to the legacy 1-on-1 columns so threads created before
   * the junction-table backfill still notify both parties.
   */
  private async fanoutThreadChange(threadId: string): Promise<void> {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      select: {
        studentId: true,
        tutor: { select: { userId: true } },
        participants: { select: { userId: true } },
      },
    });
    if (!thread) return;
    const audience = Array.from(
      new Set<string>(
        [
          thread.studentId ?? undefined,
          thread.tutor.userId,
          ...thread.participants.map((p) => p.userId),
        ].filter((x): x is string => !!x),
      ),
    );
    if (audience.length === 0) return;
    // Umbrella key — prefix-invalidates messages, threads, and proposal
    // queries together. Frontend's notification-sse-listener does the
    // actual queryClient.invalidateQueries({queryKey: ["chat"]}) call.
    this.sse.publishInvalidate(audience, ["chat"]);
  }

  async threadsForUser(supabaseId: string): Promise<ChatThread[]> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) return [];
    // FR-TH-18: junction membership is the new authoritative filter, but
    // we also accept the legacy 1-on-1 columns (studentId / tutor.userId)
    // as a fallback. This matches assertParticipant and prevents orphan
    // threads — created by older openWithTutor / ensureThreadForBooking
    // paths that pre-dated the participant insert — from disappearing
    // from /chat before they get backfilled.
    const rows = await this.prisma.chatThread.findMany({
      where: {
        OR: [
          { participants: { some: { userId: user.id } } },
          { studentId: user.id },
          { tutor: { userId: user.id } },
        ],
      },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        student: true,
        tutor: { include: { user: true } },
        participants: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        },
        // V2 chat redesign: pull the linked Booking + its currently
        // negotiating PostponeRequest so threadRowBookingSummary() can
        // compute the badge (paid/proposed/completed) + scheduledAt +
        // subject without a follow-up query per row.
        booking: {
          include: {
            postponeRequest: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      rows.map(async (t) => {
        const lastMessagePreview = t.messages[0]?.body ?? "";
        const lastMessageAt =
          t.messages[0]?.createdAt.toISOString() ?? t.createdAt.toISOString();

        const bookingSummary = this.threadRowBookingSummary(t.booking);

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
              verified: t.tutor.isVerified,
            },
            bookingSummary,
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
              verified: t.tutor.isVerified,
            }
          : {
              displayName: student.displayName,
              avatarUrl: student.avatarUrl ?? undefined,
              role: "student" as const,
              verified: false,
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
          bookingSummary,
        };
      }),
    );
  }

  // V2 chat redesign helper: derive the thread-row booking pill from the
  // joined Booking + its active PostponeRequest. Returns undefined when
  // the thread has no linked booking (e.g. open-with-tutor conversations
  // that haven't booked yet). "proposed" wins over the underlying
  // booking status while a negotiation is in flight.
  private threadRowBookingSummary(
    booking:
      | (null | undefined)
      | {
          status: string;
          scheduledAt: Date;
          subject: string;
          postponeRequest: { status: string } | null;
        },
  ): ChatThreadBookingSummary | undefined {
    if (!booking) return undefined;
    const negotiating =
      booking.postponeRequest?.status === "negotiating";
    let status: ChatThreadBookingSummary["status"];
    if (negotiating) status = "proposed";
    else if (booking.status === "paid") status = "paid";
    else if (booking.status === "completed") status = "completed";
    else status = "other";
    return {
      status,
      scheduledAt: booking.scheduledAt.toISOString(),
      subject: booking.subject,
    };
  }

  // V2 chat redesign: synthesize the inline booking-proposal card from
  // the thread's linked PostponeRequest. Returns null when there's no
  // active proposal — the client suppresses the card in that case.
  // Authorization piggy-backs on assertParticipant so only thread members
  // can read the proposal.
  async bookingProposal(
    supabaseId: string,
    threadId: string,
  ): Promise<ChatBookingProposal | null> {
    await this.assertParticipant(supabaseId, threadId);
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      select: {
        booking: {
          select: {
            subject: true,
            durationMinutes: true,
            postponeRequest: {
              include: {
                initiator: { select: { id: true, displayName: true } },
              },
            },
          },
        },
      },
    });
    const pr = thread?.booking?.postponeRequest;
    if (!pr || !thread?.booking) return null;
    return {
      id: pr.id,
      fromUserId: pr.initiatorId,
      fromDisplayName: pr.initiator.displayName,
      proposedAt: pr.proposedAt?.toISOString() ?? null,
      durationMinutes: pr.proposedDuration ?? thread.booking.durationMinutes,
      subject: thread.booking.subject,
      note: pr.reason,
      status: pr.status as ChatBookingProposal["status"],
    };
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
        booking: { include: { postponeRequest: true } },
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
          verified: full.tutor.isVerified,
        }
      : {
          displayName: student.displayName,
          avatarUrl: student.avatarUrl ?? undefined,
          role: "student" as const,
          verified: false,
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
      bookingSummary: this.threadRowBookingSummary(full.booking),
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
      verified: tutor.isVerified,
    };
    const existing = await this.prisma.chatThread.findFirst({
      where: { studentId: user.id, tutorId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (existing) {
      // FR-TH-18: backfill participant rows for threads created before
      // junction membership was wired in here. threadsForUser filters on
      // ChatThreadParticipant — without these rows the thread vanishes
      // from /chat on the next client refetch.
      await this.ensureOneOnOneParticipants(existing.id, user.id, tutor.userId);
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
      data: {
        studentId: user.id,
        tutorId,
        participants: {
          create: [{ userId: user.id }, { userId: tutor.userId }],
        },
      },
    });
    // Tell both sides their threads list has a new entry.
    this.sse.publishInvalidate([user.id, tutor.userId], ["chat"]);
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

  // FR-TH-18: idempotent backfill of the two participant rows for a 1-on-1
  // thread. Used by openWithTutor + ensureThreadForBooking when an existing
  // thread is found, so any orphan thread becomes visible to threadsForUser
  // the moment a user touches it again.
  private async ensureOneOnOneParticipants(
    threadId: string,
    studentUserId: string,
    tutorUserId: string,
  ): Promise<void> {
    await this.prisma.chatThreadParticipant.createMany({
      data: [
        { threadId, userId: studentUserId },
        { threadId, userId: tutorUserId },
      ],
      skipDuplicates: true,
    });
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
    await this.fanoutThreadChange(threadId);
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
      select: {
        id: true,
        studentId: true,
        tutorId: true,
        tutor: { select: { userId: true } },
      },
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
      // FR-TH-18: see openWithTutor — orphan threads without participant
      // rows are invisible to threadsForUser; backfill on every touch.
      await this.ensureOneOnOneParticipants(
        existing.id,
        booking.studentId,
        booking.tutor.userId,
      );
      return { id: existing.id };
    }
    const created = await this.prisma.chatThread.create({
      data: {
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        bookingId,
        participants: {
          create: [
            { userId: booking.studentId },
            { userId: booking.tutor.userId },
          ],
        },
      },
      select: { id: true },
    });
    this.sse.publishInvalidate(
      [booking.studentId, booking.tutor.userId],
      ["chat"],
    );
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
    await this.fanoutThreadChange(threadId);
  }

  async closeThread(threadId: string): Promise<void> {
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { closedAt: new Date() },
    });
    await this.fanoutThreadChange(threadId);
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
   * FR-TH-18 rev3: idempotent. Creates a group ChatThread for a confirmed
   * group booking, with ChatThreadParticipant rows for the host (status
   * "paid" — they paid for the seats), every accepted invitee (status
   * "accepted" — they RSVP'd but don't pay; only the host pays under
   * rev2+), and the tutor's User. Returns the thread id so the caller
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
        // FR-TH-18 rev3: include host + accepted invitees. Filtering to
        // `status: "paid"` (the rev1 filter) excluded every invitee
        // because they never pay — only the host's seat shows "paid".
        // Declined/expired invitees stay out of the thread.
        participants: {
          where: { status: { in: ["paid", "accepted"] } },
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
    // New thread → every member's /chat list gains a row immediately.
    this.sse.publishInvalidate(userIds, ["chat"]);
    return created;
  }
}
