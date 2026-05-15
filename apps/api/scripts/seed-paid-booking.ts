// One-off: seeds a paid booking with a Meet link inside the ±2h join window
// so the new FR-TH-17 "เข้าห้องเรียน" button has something to render against.
// Run with: pnpm exec tsx --env-file=.env scripts/seed-paid-booking.ts
import { PrismaClient } from "@prisma/client";

const STUDENT_SUPABASE_ID = "69ecfb95-5607-4e07-90a0-e499307c773a"; // h490884@gmail.com
const TUTOR_PROFILE_ID = "39cf856c-9221-47a5-bc40-a8be70b7346a"; // kantee.k@kkumail.com (STD 123)

async function main() {
  const p = new PrismaClient();
  const student = await p.user.findUniqueOrThrow({
    where: { supabaseId: STUDENT_SUPABASE_ID },
  });
  const tutor = await p.tutorProfile.findUniqueOrThrow({
    where: { id: TUTOR_PROFILE_ID },
    include: { user: true },
  });

  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 2 * 60_000);
  const endsAt = new Date(scheduledAt.getTime() + 60 * 60_000);

  const booking = await p.booking.create({
    data: {
      studentId: student.id,
      tutorId: tutor.id,
      subject: "Math",
      status: "paid",
      scheduledAt,
      durationMinutes: 60,
      amountThb: 600,
      acceptDeadlineAt: scheduledAt,
      reportWindowEndsAt: new Date(endsAt.getTime() + 24 * 60 * 60_000),
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      meetingGeneratedAt: new Date(),
      googleCalendarEventId: `evt_test_${Date.now()}`,
    },
  });

  await p.paymentIntent.create({
    data: {
      payerId: student.id,
      itemType: "booking",
      bookingId: booking.id,
      amountThb: 600,
      promptPayQrPayload: "promptpay-stub:amount=600",
      status: "held_in_escrow",
      expiresAt: new Date(now.getTime() + 60 * 60_000),
    },
  });

  const thread = await p.chatThread.upsert({
    where: { studentId_tutorId: { studentId: student.id, tutorId: tutor.id } },
    create: { studentId: student.id, tutorId: tutor.id, bookingId: booking.id },
    update: { bookingId: booking.id, closedAt: null },
  });

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
      authorId: student.id,
      kind: "system",
      body: [
        "🟢 ถึงเวลาเรียนแล้ว",
        "คลาส: Math",
        `เวลา: ${when} (60 นาที)`,
        "ลิงก์ Google Meet: https://meet.google.com/abc-defg-hij",
        "",
        "กดลิงก์ด้านบนเพื่อเข้าห้องเรียน",
      ].join("\n"),
    },
  });

  console.log(
    JSON.stringify(
      {
        bookingId: booking.id,
        studentEmail: student.email,
        tutorEmail: tutor.user.email,
        scheduledAt: scheduledAt.toISOString(),
        meetingUrl: booking.meetingUrl,
        threadId: thread.id,
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
