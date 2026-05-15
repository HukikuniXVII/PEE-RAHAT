// One-off: seeds a handful of completed bookings + released_for_payout
// PaymentIntents (payoutId=null) so the admin /admin/payouts queue panel
// shows tutors grouped with non-zero net amounts to transfer. Re-runnable —
// each run adds a fresh batch.
//
// Run with: pnpm exec tsx --env-file=.env scripts/seed-payout-queue.ts
import { PrismaClient } from "@prisma/client";

const STUDENT_SUPABASE_ID = "69ecfb95-5607-4e07-90a0-e499307c773a"; // h490884@gmail.com

const TUTORS: { id: string; subject: string }[] = [
  { id: "39cf856c-9221-47a5-bc40-a8be70b7346a", subject: "Math" }, // STD 123 (kantee.k@kkumail.com)
  { id: "64ac7bda-0d7f-4220-8060-dbdb25385757", subject: "Physics" }, // พี่นัท
];

// Three classes for tutor[0], two for tutor[1] — enough to show grouping
// + commission totals that differ per tutor.
const RELEASES = [
  { tutorIdx: 0, amount: 400 },
  { tutorIdx: 0, amount: 600 },
  { tutorIdx: 0, amount: 350 },
  { tutorIdx: 1, amount: 800 },
  { tutorIdx: 1, amount: 500 },
];

async function main() {
  const p = new PrismaClient();
  const student = await p.user.findUniqueOrThrow({
    where: { supabaseId: STUDENT_SUPABASE_ID },
  });

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60_000);
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60_000);

  const created: { bookingId: string; tutorId: string; amountThb: number }[] = [];
  for (const release of RELEASES) {
    const tutor = TUTORS[release.tutorIdx]!;
    const booking = await p.booking.create({
      data: {
        studentId: student.id,
        tutorId: tutor.id,
        subject: tutor.subject,
        // status=completed + reportWindowEndsAt in the past = eligible for
        // release-for-payout. We skip the cron and pre-set the intent.
        status: "completed",
        scheduledAt: sixDaysAgo,
        durationMinutes: 60,
        amountThb: release.amount,
        acceptDeadlineAt: sixDaysAgo,
        reportWindowEndsAt: fiveDaysAgo,
      },
    });

    await p.paymentIntent.create({
      data: {
        payerId: student.id,
        itemType: "booking",
        bookingId: booking.id,
        amountThb: release.amount,
        originalAmountThb: release.amount,
        promptPayQrPayload: "promptpay-stub:queue-seed",
        status: "released_for_payout",
        // transactionId omitted on purpose — uniqueness index allows NULLs.
        releasedAt: fiveDaysAgo,
        expiresAt: fiveDaysAgo,
        slipUploadedAt: sixDaysAgo,
        // Mark this slip as past-zercle so it doesn't clash with real flows.
        zercleVerifiedAt: sixDaysAgo,
        verifiedAmountThb: release.amount,
      },
    });

    created.push({
      bookingId: booking.id,
      tutorId: tutor.id,
      amountThb: release.amount,
    });
  }

  console.log(
    JSON.stringify(
      {
        seededIntents: created.length,
        breakdown: TUTORS.map((t, i) => ({
          tutorId: t.id,
          subject: t.subject,
          classes: created.filter((c) => c.tutorId === t.id).length,
          gross: created
            .filter((c) => c.tutorId === t.id)
            .reduce((s, c) => s + c.amountThb, 0),
        })),
        adminLogin: "kimkung6544@gmail.com",
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
