// One-off: deletes the older test booking and "regenerates" the Meet on
// the kept one — mirrors what POST /admin/bookings/:id/regenerate-meet
// does to the data, since Calendar isn't wired in dev. Also bumps
// scheduledAt forward so the new 24h-gated join button shows active.
//
// Run with: pnpm exec tsx --env-file=.env scripts/regenerate-meet-test.ts
import { PrismaClient } from "@prisma/client";

const OLD_ID = "f18ee1c0-41ac-4900-afe0-822a3f2c4699";
const KEEP_ID = "24d98576-5df2-49ee-b1c8-5d2d701a208b";

async function main() {
  const p = new PrismaClient();

  // 1. Delete the older booking + its PaymentIntent (FK cascade isn't set).
  await p.paymentIntent.deleteMany({ where: { bookingId: OLD_ID } });
  const deleted = await p.booking.delete({ where: { id: OLD_ID } });

  // 2. Regenerate meet on the kept booking: clear fields, bump scheduledAt
  //    to +30 min from now so the new 24h-gated join button shows active,
  //    then write a fresh meetingUrl + post a new system chat message.
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 30 * 60_000);
  const meetingUrl =
    "https://meet.google.com/regen-" + Math.random().toString(36).slice(2, 8);
  const eventId = "evt_regen_" + Date.now();

  const booking = await p.booking.update({
    where: { id: KEEP_ID },
    data: {
      scheduledAt,
      acceptDeadlineAt: scheduledAt,
      reportWindowEndsAt: new Date(
        scheduledAt.getTime() + 24 * 60 * 60_000 + 60 * 60_000,
      ),
      meetingUrl,
      meetingGeneratedAt: now,
      googleCalendarEventId: eventId,
    },
  });

  const thread = await p.chatThread.findFirst({
    where: { bookingId: booking.id },
  });
  if (thread) {
    const when = scheduledAt.toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await p.chatMessage.create({
      data: {
        threadId: thread.id,
        authorId: booking.studentId,
        kind: "system",
        body: [
          "🟢 ลิงก์ห้องเรียนพร้อมแล้ว (regenerated)",
          `${booking.subject} • ${when} • 60 นาที`,
          meetingUrl,
          "กดลิงก์เมื่อถึงเวลาเรียนเพื่อเข้าห้อง",
        ].join("\n"),
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        deleted: deleted.id,
        regenerated: {
          bookingId: booking.id,
          scheduledAt: booking.scheduledAt.toISOString(),
          meetingUrl: booking.meetingUrl,
          googleCalendarEventId: booking.googleCalendarEventId,
          threadId: thread?.id ?? null,
        },
      },
      null,
      2,
    ),
  );
  await p.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
