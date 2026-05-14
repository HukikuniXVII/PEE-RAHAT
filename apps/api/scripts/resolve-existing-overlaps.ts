/**
 * FR-TH-15 cleanup: detect bookings that overlap on either the same
 * student's calendar or the same tutor's calendar, then cancel the
 * later-created one with a 100% student refund. Run once after the
 * overlap-guard rollout to clear pre-existing conflicts.
 *
 *   pnpm --filter @peerahat/api tsx scripts/resolve-existing-overlaps.ts --dry-run
 *   pnpm --filter @peerahat/api tsx scripts/resolve-existing-overlaps.ts
 *
 * Dry-run only prints; live mode writes the resolution CSV to the OS
 * temp dir for admin review. The tutor's defectCount is NOT bumped —
 * the overlap is the platform's lapse, not the tutor's fault.
 */

import { PrismaClient } from "@prisma/client";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { RefundPolicyService } from "../src/payments/refund-policy.service";

const ACTIVE_STATUSES = [
  "requested",
  "accepted",
  "paid",
  "postpone_pending",
  "postponed",
] as const;

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();
const refundPolicy = new RefundPolicyService();

interface OverlapRow {
  aId: string;
  bId: string;
  aCreatedAt: Date;
  bCreatedAt: Date;
  sameStudent: boolean;
  sameTutor: boolean;
}

interface ResolvedPair {
  keepId: string;
  cancelId: string;
  reason: "same-student" | "same-tutor" | "both";
}

async function findOverlappingPairs(): Promise<ResolvedPair[]> {
  // a.id < b.id ensures we visit each pair exactly once. Same-student OR
  // same-tutor means the conflict lands on at least one calendar.
  const rows = await prisma.$queryRaw<OverlapRow[]>`
    SELECT
      a.id AS "aId", a."createdAt" AS "aCreatedAt",
      b.id AS "bId", b."createdAt" AS "bCreatedAt",
      (a."studentId" = b."studentId") AS "sameStudent",
      (a."tutorId" = b."tutorId") AS "sameTutor"
    FROM "Booking" a
    JOIN "Booking" b ON a.id < b.id
    WHERE
      a.status::text IN ('requested','accepted','paid','postpone_pending','postponed')
      AND b.status::text IN ('requested','accepted','paid','postpone_pending','postponed')
      AND (a."studentId" = b."studentId" OR a."tutorId" = b."tutorId")
      AND a."scheduledAt" < b."scheduledAt" + (b."durationMinutes" || ' minutes')::interval
      AND a."scheduledAt" + (a."durationMinutes" || ' minutes')::interval > b."scheduledAt"
  `;
  return rows.map((r) => {
    const earlier = r.aCreatedAt <= r.bCreatedAt ? r.aId : r.bId;
    const later = earlier === r.aId ? r.bId : r.aId;
    return {
      keepId: earlier,
      cancelId: later,
      reason:
        r.sameStudent && r.sameTutor
          ? ("both" as const)
          : r.sameStudent
            ? ("same-student" as const)
            : ("same-tutor" as const),
    };
  });
}

interface ResolutionAction {
  keepId: string;
  cancelId: string;
  refundedThb: number;
  reason: ResolvedPair["reason"];
  skipped?: "already-resolved" | "no-payment-intent";
}

async function applyResolution(pair: ResolvedPair): Promise<ResolutionAction> {
  const booking = await prisma.booking.findUnique({
    where: { id: pair.cancelId },
    include: { paymentIntent: true },
  });
  if (!booking) {
    return { ...pair, refundedThb: 0, skipped: "already-resolved" };
  }
  // A booking may participate in multiple overlapping pairs; once we've
  // cancelled it in a prior iteration, skip it on subsequent pairs.
  if (
    !ACTIVE_STATUSES.includes(booking.status as (typeof ACTIVE_STATUSES)[number])
  ) {
    return { ...pair, refundedThb: 0, skipped: "already-resolved" };
  }

  if (!booking.paymentIntent) {
    if (!dryRun) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "cancelled_no_agreement" },
      });
    }
    return { ...pair, refundedThb: 0, skipped: "no-payment-intent" };
  }

  const split = refundPolicy.computeAdminManualRefund(
    booking.paymentIntent.amountThb,
  );

  if (!dryRun) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: booking.paymentIntent!.id },
        data: { amountThb: split.tutorThb, status: "refunded" },
      });
      await tx.refundLedger.create({
        data: {
          paymentIntentId: booking.paymentIntent!.id,
          bookingId: booking.id,
          originalAmountThb: booking.paymentIntent!.amountThb,
          studentRefundThb: split.studentRefundThb,
          tutorThb: split.tutorThb,
          platformThb: split.platformThb,
          reasonCode: "admin_manual",
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "cancelled_no_agreement" },
      });
    });
  }

  return {
    keepId: pair.keepId,
    cancelId: pair.cancelId,
    refundedThb: split.studentRefundThb,
    reason: pair.reason,
  };
}

function toCsv(rows: ResolutionAction[]): string {
  const header = "keepBookingId,cancelBookingId,refundedThb,reason,skipped";
  const lines = rows.map((r) =>
    [r.keepId, r.cancelId, r.refundedThb, r.reason, r.skipped ?? ""].join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

async function main() {
  const mode = dryRun ? "[DRY-RUN]" : "[LIVE]";
  console.log(`${mode} scanning for overlapping bookings…`);
  const pairs = await findOverlappingPairs();
  console.log(`${mode} found ${pairs.length} overlapping pair(s).`);

  const actions: ResolutionAction[] = [];
  for (const pair of pairs) {
    const action = await applyResolution(pair);
    actions.push(action);
    const tag = action.skipped ? `skip:${action.skipped}` : "resolved";
    console.log(
      `  ${tag}  keep ${action.keepId.slice(0, 8)} • cancel ${action.cancelId.slice(0, 8)} • refund ฿${action.refundedThb} • ${action.reason}`,
    );
  }

  if (actions.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = mkdtempSync(join(tmpdir(), "overlap-resolution-"));
    const csvPath = join(dir, `overlap-resolution-${stamp}.csv`);
    if (dryRun) {
      console.log(`${mode} would write ${csvPath}`);
    } else {
      writeFileSync(csvPath, toCsv(actions), "utf8");
      console.log(`${mode} wrote ${csvPath}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
