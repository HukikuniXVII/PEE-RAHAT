import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ResolveReportDto } from "@peerahat/types";
import type { Report } from "@prisma/client";

import type { PrismaService } from "../prisma/prisma.service";
import { ReportResolutionService } from "./report-resolution.service";

const NOW = new Date("2026-05-22T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

/** A Report row with sensible defaults for the resolution tests. */
function report(over: Partial<Report> = {}): Report {
  return {
    id: "rep-1",
    status: "under_review",
    reporterId: "u-reporter",
    targetUserId: "u-target",
    targetType: "community_post",
    targetId: "po1",
    linkedBookingId: null,
    assignedToId: "admin-1",
    ...over,
  } as Report;
}

interface TxOverrides {
  report?: Report | null;
  booking?: unknown;
  bookings?: unknown[];
  tutorProfile?: { id: string } | null;
}

function makeTx(over: TxOverrides = {}) {
  return {
    report: {
      findUnique: jest
        .fn()
        .mockResolvedValue(over.report === undefined ? report() : over.report),
      update: jest.fn().mockResolvedValue({}),
    },
    reportEvent: { create: jest.fn().mockResolvedValue({}) },
    user: { update: jest.fn().mockResolvedValue({}) },
    studySheet: { update: jest.fn().mockResolvedValue({}) },
    tutorReview: { update: jest.fn().mockResolvedValue({}) },
    communityPost: { update: jest.fn().mockResolvedValue({}) },
    chatMessage: { update: jest.fn().mockResolvedValue({}) },
    tutorProfile: {
      findUnique: jest.fn().mockResolvedValue(over.tutorProfile ?? null),
      update: jest.fn().mockResolvedValue({}),
    },
    booking: {
      findUnique: jest.fn().mockResolvedValue(over.booking ?? null),
      findMany: jest.fn().mockResolvedValue(over.bookings ?? []),
      update: jest.fn().mockResolvedValue({}),
    },
    paymentIntent: { update: jest.fn().mockResolvedValue({}) },
    refundLedger: { create: jest.fn().mockResolvedValue({}) },
  };
}

type Tx = ReturnType<typeof makeTx>;

function makeService(tx: Tx): ReportResolutionService {
  const prisma = {
    $transaction: jest.fn((cb: (t: Tx) => Promise<unknown>) => cb(tx)),
  };
  return new ReportResolutionService(prisma as unknown as PrismaService);
}

function dto(over: Partial<ResolveReportDto> & Pick<ResolveReportDto, "resolution">): ResolveReportDto {
  return { resolutionNote: "note", ...over } as ResolveReportDto;
}

describe("ReportResolutionService (FR-CM-05 / FR-SM-07 / FR-PM-05)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("guards", () => {
    it("404s when the report does not exist", async () => {
      const tx = makeTx({ report: null });
      await expect(
        makeService(tx).execute({
          reportId: "rep-1",
          executedBy: "admin-1",
          dto: dto({ resolution: "no_action" }),
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects a report that is already closed", async () => {
      const tx = makeTx({ report: report({ status: "resolved" }) });
      await expect(
        makeService(tx).execute({
          reportId: "rep-1",
          executedBy: "admin-1",
          dto: dto({ resolution: "no_action" }),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("status update + timeline", () => {
    it("closes the report and writes a resolution event", async () => {
      const tx = makeTx();
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-9",
        dto: dto({ resolution: "no_action", publicResponse: "ขอบคุณครับ" }),
      });
      expect(tx.report.update).toHaveBeenCalledWith({
        where: { id: "rep-1" },
        data: expect.objectContaining({
          status: "resolved",
          resolution: "no_action",
          publicResponse: "ขอบคุณครับ",
        }),
      });
      expect(tx.reportEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportId: "rep-1",
          kind: "resolution",
          authorId: "admin-9",
        }),
      });
      // no_action has no downstream effect.
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe("warning_issued", () => {
    it("increments the target user's warningCount", async () => {
      const tx = makeTx();
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "warning_issued" }),
      });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u-target" },
        data: { warningCount: { increment: 1 } },
      });
    });

    it("rejects when the report has no target user", async () => {
      const tx = makeTx({ report: report({ targetUserId: null }) });
      await expect(
        makeService(tx).execute({
          reportId: "rep-1",
          executedBy: "admin-1",
          dto: dto({ resolution: "warning_issued" }),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("reporter_warned", () => {
    it("increments the reporter's falseReportCount", async () => {
      const tx = makeTx();
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "reporter_warned" }),
      });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u-reporter" },
        data: { falseReportCount: { increment: 1 } },
      });
    });
  });

  describe("suspension_temp", () => {
    it("suspends the target user for the default 7 days", async () => {
      const tx = makeTx();
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "suspension_temp" }),
      });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u-target" },
        data: { suspendedUntil: new Date(NOW.getTime() + 7 * DAY) },
      });
    });

    it("honours an admin-chosen suspension length", async () => {
      const tx = makeTx();
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "suspension_temp", suspensionDays: 30 }),
      });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u-target" },
        data: { suspendedUntil: new Date(NOW.getTime() + 30 * DAY) },
      });
    });
  });

  describe("suspension_perm / account_banned", () => {
    it("parks suspendedUntil far in the future and cancels future bookings", async () => {
      const tx = makeTx({
        bookings: [
          {
            id: "bk1",
            paymentIntent: {
              id: "pi1",
              status: "held_in_escrow",
              amountThb: 1000,
              originalAmountThb: null,
            },
          },
        ],
      });
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "suspension_perm" }),
      });
      const update = tx.user.update.mock.calls[0][0];
      expect(update.data.suspendedUntil.getUTCFullYear()).toBe(2099);
      // a held-escrow upcoming booking is 100% refunded + cancelled.
      expect(tx.refundLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: "bk1",
          studentRefundThb: 1000,
          tutorThb: 0,
          reasonCode: "admin_manual",
          reportId: "rep-1",
        }),
      });
      expect(tx.booking.update).toHaveBeenCalledWith({
        where: { id: "bk1" },
        data: { status: "cancelled" },
      });
    });
  });

  describe("content_removed", () => {
    it("hides a reported sheet", async () => {
      const tx = makeTx({ report: report({ targetType: "sheet", targetId: "sh1" }) });
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "content_removed", removedReason: "ละเมิดลิขสิทธิ์" }),
      });
      expect(tx.studySheet.update).toHaveBeenCalledWith({
        where: { id: "sh1" },
        data: expect.objectContaining({ removed: true, removedReason: "ละเมิดลิขสิทธิ์" }),
      });
    });

    it("redacts a reported chat message (no removed column on ChatMessage)", async () => {
      const tx = makeTx({
        report: report({ targetType: "chat_message", targetId: "m1" }),
      });
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "content_removed", removedReason: "บายพาส" }),
      });
      expect(tx.chatMessage.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { redacted: true },
      });
    });

    it("rejects content_removed on a booking target", async () => {
      const tx = makeTx({ report: report({ targetType: "booking", targetId: "bk1" }) });
      await expect(
        makeService(tx).execute({
          reportId: "rep-1",
          executedBy: "admin-1",
          dto: dto({ resolution: "content_removed", removedReason: "x" }),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("refunds", () => {
    const bookingWithEscrow = {
      id: "bk1",
      tutorId: "tutor-profile-1",
      paymentIntent: {
        id: "pi1",
        status: "held_in_escrow",
        amountThb: 1000,
        originalAmountThb: null,
      },
    };

    it("refund_full writes a 100% RefundLedger row linked to the report", async () => {
      const tx = makeTx({
        report: report({ targetType: "booking", targetId: "bk1", linkedBookingId: "bk1" }),
        booking: bookingWithEscrow,
      });
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "refund_full" }),
      });
      expect(tx.refundLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentRefundThb: 1000,
          tutorThb: 0,
          platformThb: 0,
          reasonCode: "admin_manual",
          reportId: "rep-1",
        }),
      });
      expect(tx.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: "pi1" },
        data: expect.objectContaining({ status: "refunded" }),
      });
      // tutor not at fault → no defect increment.
      expect(tx.tutorProfile.update).not.toHaveBeenCalled();
    });

    it("refund_full increments tutor defectCount when the tutor is at fault", async () => {
      const tx = makeTx({
        report: report({ targetType: "booking", targetId: "bk1", linkedBookingId: "bk1" }),
        booking: bookingWithEscrow,
      });
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({ resolution: "refund_full", tutorAtFault: true }),
      });
      expect(tx.tutorProfile.update).toHaveBeenCalledWith({
        where: { id: "tutor-profile-1" },
        data: { defectCount: { increment: 1 } },
      });
    });

    it("refund_partial splits the escrow by the admin percentages", async () => {
      const tx = makeTx({
        report: report({ targetType: "booking", targetId: "bk1", linkedBookingId: "bk1" }),
        booking: bookingWithEscrow,
      });
      await makeService(tx).execute({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto: dto({
          resolution: "refund_partial",
          refundSplit: { studentPct: 60, tutorPct: 30, platformPct: 10 },
        }),
      });
      expect(tx.refundLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentRefundThb: 600,
          tutorThb: 300,
          platformThb: 100,
        }),
      });
      expect(tx.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: "pi1" },
        data: expect.objectContaining({ status: "partially_refunded", amountThb: 300 }),
      });
    });

    it("rejects a refund on a report not linked to a booking", async () => {
      const tx = makeTx({ report: report({ linkedBookingId: null }) });
      await expect(
        makeService(tx).execute({
          reportId: "rep-1",
          executedBy: "admin-1",
          dto: dto({ resolution: "refund_full" }),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
