import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { addMinutes, format } from "date-fns";
import { google } from "googleapis";

import { ChatService } from "../../chat/chat.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Pull the join URL off a Calendar event. `hangoutLink` is the canonical
 * field but Workspace sometimes omits it for service-account-created
 * events; the same URL is mirrored on
 * `conferenceData.entryPoints[].uri` where `entryPointType === "video"`.
 * This fallback keeps us robust against the inconsistency.
 */
function extractMeetingUrl(
  event: { hangoutLink?: string | null; conferenceData?: { entryPoints?: Array<{ entryPointType?: string | null; uri?: string | null }> | null } | null } | null | undefined,
): string | null {
  if (!event) return null;
  if (event.hangoutLink) return event.hangoutLink;
  const entry = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video",
  );
  return entry?.uri ?? null;
}

/**
 * FR-TH-17: wraps the Google Calendar API to mint a Meet link for a paid
 * booking, then posts a system message into the booking's chat thread.
 *
 * Auth model: a single platform service account with domain-wide delegation
 * impersonates `GOOGLE_CALENDAR_OWNER_EMAIL` and writes the event onto that
 * mailbox's primary calendar. Both student and tutor are added as attendees
 * so Google sends them native calendar invites — the Meet link itself is
 * open-to-link, no Workspace login required.
 */
@Injectable()
export class GoogleMeetService {
  private readonly logger = new Logger(GoogleMeetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  isEnabled(): boolean {
    return process.env.GOOGLE_MEET_ENABLED === "true";
  }

  /**
   * Idempotent: if `booking.meetingUrl` is already set, returns it without
   * touching Calendar — protects against re-runs (worker retry, postpone
   * re-enqueue collisions, manual replays).
   */
  async createForBooking(
    bookingId: string,
  ): Promise<{ meetingUrl: string | null; reused: boolean }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, email: true, displayName: true } },
        tutor: { include: { user: { select: { email: true, displayName: true } } } },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    if (booking.meetingUrl) {
      return { meetingUrl: booking.meetingUrl, reused: true };
    }

    if (!this.isEnabled()) {
      throw new BadRequestException(
        "GOOGLE_MEET_ENABLED=false — caller must branch on isEnabled() before createForBooking()",
      );
    }

    const startsAt = booking.scheduledAt;
    const endsAt = addMinutes(startsAt, booking.durationMinutes);

    const calendar = google.calendar({ version: "v3", auth: this.buildAuth() });
    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: `Pee Rahat: ${booking.subject} กับพี่ ${booking.tutor.user.displayName}`,
        description: `คลาสติว ${booking.subject} (${booking.durationMinutes} นาที) — ลิงก์เข้าห้องเรียนสำหรับน้องและพี่ติว`,
        start: { dateTime: startsAt.toISOString(), timeZone: "Asia/Bangkok" },
        end: { dateTime: endsAt.toISOString(), timeZone: "Asia/Bangkok" },
        attendees: [
          { email: booking.student.email, displayName: booking.student.displayName },
          {
            email: booking.tutor.user.email,
            displayName: booking.tutor.user.displayName,
          },
        ],
        conferenceData: {
          createRequest: {
            requestId: `booking-${booking.id}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetingUrl = extractMeetingUrl(event.data);
    const calendarEventId = event.data.id ?? null;
    if (!meetingUrl) {
      this.logger.error(
        `Calendar event ${calendarEventId} created without a Meet entry point — Workspace conferencing may be disabled`,
      );
      return { meetingUrl: null, reused: false };
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        meetingUrl,
        meetingGeneratedAt: new Date(),
        googleCalendarEventId: calendarEventId,
      },
    });

    await this.postLinkMessage(booking.id, {
      subject: booking.subject,
      scheduledAt: startsAt,
      durationMinutes: booking.durationMinutes,
      meetingUrl,
      studentUserId: booking.studentId,
    });

    return { meetingUrl, reused: false };
  }

  /**
   * Used by postpone-confirm to clean up the old calendar event after the
   * cloned booking gets its own fresh link. Failures here are non-fatal —
   * a stale event is annoying but doesn't break the flow.
   */
  async deleteEvent(calendarEventId: string): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const calendar = google.calendar({ version: "v3", auth: this.buildAuth() });
      await calendar.events.delete({
        calendarId: "primary",
        eventId: calendarEventId,
        sendUpdates: "all",
      });
    } catch (err) {
      this.logger.warn(
        `Failed to delete Calendar event ${calendarEventId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Fallback when GOOGLE_MEET_ENABLED=false — keeps the booking flow shippable
   * before Workspace is provisioned. The student is told to ask the tutor
   * directly for a link.
   */
  async postFallbackMessage(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, studentId: true },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    const thread = await this.chat.ensureThreadForBooking(booking.id);
    await this.chat.postSystemMessage(
      thread.id,
      "🟡 ถึงเวลาเรียนแล้ว — ติดต่อพี่ติวเพื่อขอลิงก์ห้องเรียน",
      booking.studentId,
    );
  }

  private async postLinkMessage(
    bookingId: string,
    args: {
      subject: string;
      scheduledAt: Date;
      durationMinutes: number;
      meetingUrl: string;
      studentUserId: string;
    },
  ): Promise<void> {
    const thread = await this.chat.ensureThreadForBooking(bookingId);
    const when = format(args.scheduledAt, "d MMM yyyy HH:mm");
    const body = [
      "🟢 ถึงเวลาเรียนแล้ว",
      `คลาส: ${args.subject}`,
      `เวลา: ${when} (${args.durationMinutes} นาที)`,
      `ลิงก์ Google Meet: ${args.meetingUrl}`,
      "",
      "กดลิงก์ด้านบนเพื่อเข้าห้องเรียน",
    ].join("\n");
    await this.chat.postSystemMessage(thread.id, body, args.studentUserId);
  }

  private buildAuth() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
    const calendarOwner = process.env.GOOGLE_CALENDAR_OWNER_EMAIL;
    if (!serviceAccountEmail || !keyBase64 || !calendarOwner) {
      throw new Error(
        "Google Meet config missing — GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, and GOOGLE_CALENDAR_OWNER_EMAIL must be set when GOOGLE_MEET_ENABLED=true",
      );
    }
    // The base64-encoded value is the full service-account JSON; we only need
    // the private_key from it so JWT auth can sign requests.
    const decoded = Buffer.from(keyBase64, "base64").toString("utf-8");
    let privateKey: string;
    try {
      const parsed = JSON.parse(decoded) as { private_key?: string };
      if (!parsed.private_key) throw new Error("Missing private_key field");
      privateKey = parsed.private_key;
    } catch (err) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not a valid base64-encoded service-account JSON: ${(err as Error).message}`,
      );
    }
    return new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      subject: calendarOwner,
    });
  }
}
