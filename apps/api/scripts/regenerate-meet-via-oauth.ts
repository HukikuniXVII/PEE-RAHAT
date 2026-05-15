// One-off: bumps the seeded test booking's scheduledAt back into the
// future, then mints a REAL Meet event on the tutor's connected Google
// calendar — same Calendar API shape that runs at payment-confirm in
// production, just invoked outside the Nest DI tree to keep the script
// fast and free of lifecycle baggage.
//
// Requires: TutorProfile.googleRefreshToken populated for the booking's
// tutor (i.e. the tutor has clicked "เชื่อมต่อ Google Calendar").
//
// Run with: pnpm exec tsx --env-file=.env scripts/regenerate-meet-via-oauth.ts
import crypto from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { addMinutes, format } from "date-fns";
import { google } from "googleapis";

const BOOKING_ID = "24d98576-5df2-49ee-b1c8-5d2d701a208b";

function decryptRefreshToken(blob: string): string {
  const key = Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(12, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}

function extractMeetingUrl(event: {
  hangoutLink?: string | null;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string | null; uri?: string | null }> | null } | null;
}): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const entry = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video",
  );
  return entry?.uri ?? null;
}

async function main() {
  const prisma = new PrismaClient();
  const booking = await prisma.booking.findUnique({
    where: { id: BOOKING_ID },
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
  if (!booking) throw new Error(`Booking ${BOOKING_ID} not found`);
  if (!booking.tutor.googleRefreshToken) {
    throw new Error(
      `Tutor ${booking.tutor.id} has not connected Google. Go to /tutors/me/edit and click "เชื่อมต่อ Google Calendar" first.`,
    );
  }

  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 30 * 60_000);
  const endTime = addMinutes(scheduledAt, booking.durationMinutes);

  await prisma.booking.update({
    where: { id: BOOKING_ID },
    data: {
      scheduledAt,
      acceptDeadlineAt: scheduledAt,
      reportWindowEndsAt: new Date(
        endTime.getTime() + 24 * 60 * 60_000,
      ),
      meetingUrl: null,
      googleCalendarEventId: null,
    },
  });

  // Build the OAuth2 client using the tutor's stored refresh token.
  // google-auth-library auto-refreshes the access_token from the
  // refresh_token on the first API call.
  const refreshToken = decryptRefreshToken(booking.tutor.googleRefreshToken);
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
  oauth2.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  console.log("\n→ Creating Calendar event on tutor's calendar...\n");
  const { data: event } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: `Pee Rahat: ${booking.subject} กับพี่ ${booking.tutor.user.displayName}`,
      start: { dateTime: scheduledAt.toISOString(), timeZone: "Asia/Bangkok" },
      end: { dateTime: endTime.toISOString(), timeZone: "Asia/Bangkok" },
      attendees: [
        { email: booking.student.email },
        { email: booking.tutor.googleEmail ?? booking.tutor.user.email },
      ],
      conferenceData: {
        createRequest: {
          requestId: `peerahat-regen-${booking.tutor.id}-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetingUrl = extractMeetingUrl(event);
  if (!event.id) throw new Error("Calendar API returned no event id");
  await prisma.booking.update({
    where: { id: BOOKING_ID },
    data: { meetingUrl, googleCalendarEventId: event.id },
  });

  // Post the same chat system message that GoogleCalendarService would.
  const thread = await prisma.chatThread.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (thread && meetingUrl) {
    const when = format(scheduledAt, "d MMM yyyy HH:mm");
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        authorId: booking.studentId,
        kind: "system",
        body: [
          "🟢 ลิงก์ห้องเรียนพร้อมแล้ว",
          `${booking.subject} • ${when} • ${booking.durationMinutes} นาที`,
          meetingUrl,
          "กดลิงก์เมื่อถึงเวลาเรียนเพื่อเข้าห้อง",
        ].join("\n"),
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        bookingId: BOOKING_ID,
        tutorGoogleEmail: booking.tutor.googleEmail,
        scheduledAt: scheduledAt.toISOString(),
        meetingUrl,
        googleCalendarEventId: event.id,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n❌ Failed:", err.message);
  if (err.response?.data) {
    console.error("Google API response:", JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
