import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { google } from "googleapis";
import { addMinutes, format } from "date-fns";

import { ChatService } from "../../chat/chat.service";
import { PrismaService } from "../../prisma/prisma.service";
import { GoogleOAuthService } from "./google-oauth.service";

interface CreateMeetLinkArgs {
  title: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails: string[];
}

interface CreateMeetLinkResult {
  meetingUrl: string | null;
  eventId: string;
}

/**
 * FR-TH-17 rev3: creates a Google Calendar event with a Meet attached
 * on the tutor's own calendar. The OAuth client is the tutor's — auth
 * acts as them, so the event lives in their `primary` calendar and the
 * Meet link is bound to their Google account.
 *
 * `event.hangoutLink` is the canonical join URL; for service-account-
 * style events Google sometimes omits it and only populates
 * `conferenceData.entryPoints[entryPointType=video].uri`. Per-user OAuth
 * usually returns hangoutLink, but the fallback is cheap and keeps us
 * robust against that inconsistency.
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly oauth: GoogleOAuthService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  /**
   * FR-TH-17 rev3: end-to-end "generate a Meet on this booking and post
   * the link to chat" — the one method PaymentsService / AdminService /
   * PostponeService all call. Idempotent on Booking.meetingUrl.
   *
   * If the tutor hasn't connected Google, we log a warning and return —
   * the caller's try/catch wrapper makes that non-fatal. Admin can
   * intervene via /admin/bookings/:id/regenerate-meet once the tutor
   * connects.
   */
  async attachToBooking(bookingId: string): Promise<{
    meetingUrl: string | null;
    eventId: string | null;
    reused: boolean;
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, email: true, displayName: true } },
        tutor: {
          select: {
            id: true,
            googleRefreshToken: true,
            googleEmail: true,
            user: { select: { displayName: true, email: true } },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    if (booking.meetingUrl) {
      return {
        meetingUrl: booking.meetingUrl,
        eventId: booking.googleCalendarEventId,
        reused: true,
      };
    }
    if (!booking.tutor.googleRefreshToken) {
      this.logger.warn(
        `Booking ${booking.id}: tutor ${booking.tutor.id} has not connected Google — cannot mint Meet link. Admin can retry via /admin/bookings/:id/regenerate-meet once the tutor connects.`,
      );
      return { meetingUrl: null, eventId: null, reused: false };
    }

    const endTime = addMinutes(booking.scheduledAt, booking.durationMinutes);
    const { meetingUrl, eventId } = await this.createMeetLink(booking.tutor.id, {
      title: `Pee Rahat: ${booking.subject} กับพี่ ${booking.tutor.user.displayName}`,
      startTime: booking.scheduledAt,
      endTime,
      attendeeEmails: [
        booking.student.email,
        booking.tutor.googleEmail ?? booking.tutor.user.email,
      ],
    });

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { meetingUrl, googleCalendarEventId: eventId },
    });

    if (meetingUrl) {
      await this.postLinkMessage(booking.id, {
        subject: booking.subject,
        scheduledAt: booking.scheduledAt,
        durationMinutes: booking.durationMinutes,
        meetingUrl,
        actorUserId: booking.studentId,
      });
    } else {
      this.logger.error(
        `Calendar event ${eventId} created for booking ${booking.id} without a Meet URL — Workspace conferencing may be disabled on the tutor's account`,
      );
    }
    return { meetingUrl, eventId, reused: false };
  }

  private async postLinkMessage(
    bookingId: string,
    args: {
      subject: string;
      scheduledAt: Date;
      durationMinutes: number;
      meetingUrl: string;
      actorUserId: string;
    },
  ): Promise<void> {
    const thread = await this.chat.ensureThreadForBooking(bookingId);
    const when = format(args.scheduledAt, "d MMM yyyy HH:mm");
    const body = [
      "🟢 ลิงก์ห้องเรียนพร้อมแล้ว",
      `${args.subject} • ${when} • ${args.durationMinutes} นาที`,
      args.meetingUrl,
      "กดลิงก์เมื่อถึงเวลาเรียนเพื่อเข้าห้อง",
    ].join("\n");
    await this.chat.postSystemMessage(thread.id, body, args.actorUserId);
  }

  async createMeetLink(
    tutorId: string,
    args: CreateMeetLinkArgs,
  ): Promise<CreateMeetLinkResult> {
    const auth = await this.oauth.getAuthorizedClient(tutorId);
    const calendar = google.calendar({ version: "v3", auth });
    const { data } = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: args.title,
        start: {
          dateTime: args.startTime.toISOString(),
          timeZone: "Asia/Bangkok",
        },
        end: {
          dateTime: args.endTime.toISOString(),
          timeZone: "Asia/Bangkok",
        },
        attendees: args.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `peerahat-${tutorId}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    if (!data.id) {
      throw new Error("Calendar API returned no event id");
    }
    return {
      meetingUrl: this.extractMeetingUrl(data),
      eventId: data.id,
    };
  }

  async deleteEvent(tutorId: string, eventId: string): Promise<void> {
    try {
      const auth = await this.oauth.getAuthorizedClient(tutorId);
      const calendar = google.calendar({ version: "v3", auth });
      await calendar.events.delete({
        calendarId: "primary",
        eventId,
        sendUpdates: "all",
      });
    } catch (err) {
      // Non-fatal: a stale event is annoying for the tutor's calendar but
      // not a correctness problem for the booking. Postpone-confirm + admin
      // regenerate both rely on this being lenient.
      this.logger.warn(
        `Failed to delete Calendar event ${eventId} for tutor ${tutorId}: ${(err as Error).message}`,
      );
    }
  }

  private extractMeetingUrl(event: {
    hangoutLink?: string | null;
    conferenceData?: {
      entryPoints?: Array<{
        entryPointType?: string | null;
        uri?: string | null;
      }> | null;
    } | null;
  }): string | null {
    if (event.hangoutLink) return event.hangoutLink;
    const entry = event.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video",
    );
    return entry?.uri ?? null;
  }
}
