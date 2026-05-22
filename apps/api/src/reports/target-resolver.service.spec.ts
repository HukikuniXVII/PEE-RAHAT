import type { ReportTarget } from "@peerahat/types";

import type { PrismaService } from "../prisma/prisma.service";
import { TargetResolverService } from "./target-resolver.service";

/** Wrap a hand-rolled prisma shape as a TargetResolverService. */
function makeResolver(prisma: Record<string, unknown>): TargetResolverService {
  return new TargetResolverService(prisma as unknown as PrismaService);
}

const MISSING = {
  exists: false,
  ownerUserIds: [],
  context: { kind: "missing" },
  bookingId: null,
};

describe("TargetResolverService (FR-CM-05 / FR-SM-07 / FR-PM-05)", () => {
  describe("booking", () => {
    const booking = {
      id: "bk1",
      studentId: "u-student",
      subject: "math",
      status: "paid",
      scheduledAt: new Date("2026-06-01T10:00:00.000Z"),
      amountThb: 50000,
      student: { displayName: "นักเรียนเอ" },
      tutor: {
        userId: "u-tutor",
        defectCount: 2,
        user: { displayName: "ติวเตอร์บี" },
      },
      paymentIntent: { status: "held_in_escrow" },
    };

    it("resolves both parties as owners + a typed booking context", async () => {
      const resolver = makeResolver({
        booking: { findUnique: jest.fn().mockResolvedValue(booking) },
      });
      const res = await resolver.resolve("booking", "bk1");
      expect(res.exists).toBe(true);
      // booking → owner = student AND tutor (both are notified).
      expect(res.ownerUserIds).toEqual(["u-student", "u-tutor"]);
      expect(res.bookingId).toBe("bk1");
      expect(res.context).toEqual({
        kind: "booking",
        bookingId: "bk1",
        subject: "math",
        status: "paid",
        scheduledAt: "2026-06-01T10:00:00.000Z",
        amountThb: 50000,
        escrowStatus: "held_in_escrow",
        tutorDefectCount: 2,
        studentName: "นักเรียนเอ",
        tutorName: "ติวเตอร์บี",
      });
    });

    it("reports a null escrow status when there is no payment intent", async () => {
      const resolver = makeResolver({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...booking, paymentIntent: null }),
        },
      });
      const res = await resolver.resolve("booking", "bk1");
      expect(res.context).toMatchObject({ escrowStatus: null });
    });

    it("returns missing when the booking is gone", async () => {
      const resolver = makeResolver({
        booking: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      expect(await resolver.resolve("booking", "nope")).toEqual(MISSING);
    });
  });

  describe("chat_message", () => {
    const message = {
      id: "m2",
      authorId: "u-tutor",
      body: "โทรมาที่ [REDACTED]",
      kind: "user",
      redacted: true,
      createdAt: new Date("2026-06-01T12:05:00.000Z"),
      thread: {
        studentId: "u-student",
        bookingId: "bk1",
        tutor: { userId: "u-tutor" },
        messages: [
          {
            id: "m1",
            authorId: "u-student",
            body: "สวัสดีค่ะ",
            kind: "user",
            createdAt: new Date("2026-06-01T12:00:00.000Z"),
          },
          {
            id: "m2",
            authorId: "u-tutor",
            body: "โทรมาที่ [REDACTED]",
            kind: "user",
            createdAt: new Date("2026-06-01T12:05:00.000Z"),
          },
          {
            id: "sys",
            authorId: "u-tutor",
            body: "ระบบสรุปการเลื่อนคลาส",
            kind: "system",
            createdAt: new Date("2026-06-01T12:10:00.000Z"),
          },
        ],
      },
    };

    it("resolves the sender as owner + the full thread with the reported message flagged", async () => {
      const resolver = makeResolver({
        chatMessage: { findUnique: jest.fn().mockResolvedValue(message) },
      });
      const res = await resolver.resolve("chat_message", "m2");
      expect(res.exists).toBe(true);
      // chat_message → owner = the message sender.
      expect(res.ownerUserIds).toEqual(["u-tutor"]);
      // bookingId comes off the thread, for linkedBookingId auto-fill.
      expect(res.bookingId).toBe("bk1");
      expect(res.context.kind).toBe("chat_message");
      if (res.context.kind !== "chat_message") throw new Error("kind");
      // `redacted` (anti-bypass filter hit) drives the bypass chip.
      expect(res.context.bypassMatch).toBe(true);
      expect(res.context.thread).toHaveLength(3);
      expect(res.context.thread[0]).toEqual({
        id: "m1",
        authorLabel: "นักเรียน",
        body: "สวัสดีค่ะ",
        createdAt: "2026-06-01T12:00:00.000Z",
        isReported: false,
      });
      expect(res.context.thread[1]).toMatchObject({
        id: "m2",
        authorLabel: "ติวเตอร์",
        isReported: true,
      });
      expect(res.context.thread[2]?.authorLabel).toBe("ระบบ");
    });

    it("returns missing when the message is gone", async () => {
      const resolver = makeResolver({
        chatMessage: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      expect(await resolver.resolve("chat_message", "nope")).toEqual(MISSING);
    });
  });

  describe("sheet", () => {
    const sheet = {
      id: "sh1",
      title: "สรุปฟิสิกส์",
      subject: "physics",
      priceThb: 12000,
      removed: false,
      seller: { userId: "u-tutor", user: { displayName: "ติวเตอร์บี" } },
    };

    it("resolves the seller's user as owner + counts sold copies", async () => {
      const count = jest.fn().mockResolvedValue(7);
      const resolver = makeResolver({
        studySheet: { findUnique: jest.fn().mockResolvedValue(sheet) },
        paymentIntent: { count },
      });
      const res = await resolver.resolve("sheet", "sh1");
      expect(res.exists).toBe(true);
      // sheet → owner = StudySheet.sellerId → TutorProfile → User.
      expect(res.ownerUserIds).toEqual(["u-tutor"]);
      expect(res.bookingId).toBeNull();
      expect(res.context).toEqual({
        kind: "sheet",
        sheetId: "sh1",
        title: "สรุปฟิสิกส์",
        subject: "physics",
        priceThb: 12000,
        salesCount: 7,
        authorId: "u-tutor",
        authorName: "ติวเตอร์บี",
        removed: false,
      });
      // sales = paid escrow states only.
      expect(count).toHaveBeenCalledWith({
        where: {
          sheetId: "sh1",
          status: { in: ["held_in_escrow", "released_for_payout", "paid_out"] },
        },
      });
    });

    it("returns missing when the sheet is gone", async () => {
      const resolver = makeResolver({
        studySheet: { findUnique: jest.fn().mockResolvedValue(null) },
        paymentIntent: { count: jest.fn() },
      });
      expect(await resolver.resolve("sheet", "nope")).toEqual(MISSING);
    });
  });

  describe("review", () => {
    const review = {
      id: "rv1",
      rating: 1,
      text: "แย่มาก ไม่แนะนำ",
      bookingId: "bk1",
      removed: false,
      studentId: "u-student",
      student: { displayName: "นักเรียนเอ" },
      tutor: { user: { displayName: "ติวเตอร์บี" } },
    };

    it("resolves the authoring student as owner", async () => {
      const resolver = makeResolver({
        tutorReview: { findUnique: jest.fn().mockResolvedValue(review) },
      });
      const res = await resolver.resolve("review", "rv1");
      expect(res.exists).toBe(true);
      // review → owner = the student who wrote it.
      expect(res.ownerUserIds).toEqual(["u-student"]);
      expect(res.bookingId).toBe("bk1");
      expect(res.context).toEqual({
        kind: "review",
        reviewId: "rv1",
        rating: 1,
        text: "แย่มาก ไม่แนะนำ",
        bookingId: "bk1",
        studentName: "นักเรียนเอ",
        tutorName: "ติวเตอร์บี",
        removed: false,
      });
    });

    it("returns missing when the review is gone", async () => {
      const resolver = makeResolver({
        tutorReview: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      expect(await resolver.resolve("review", "nope")).toEqual(MISSING);
    });
  });

  describe("community_post", () => {
    const post = {
      id: "po1",
      title: "ขายชีทราคาถูก",
      content: "ทักไลน์มาเลย",
      removed: false,
      authorId: "u-student",
      author: { displayName: "นักเรียนเอ" },
    };

    it("resolves the post author as owner", async () => {
      const resolver = makeResolver({
        communityPost: { findUnique: jest.fn().mockResolvedValue(post) },
      });
      const res = await resolver.resolve("community_post", "po1");
      expect(res.exists).toBe(true);
      expect(res.ownerUserIds).toEqual(["u-student"]);
      expect(res.bookingId).toBeNull();
      expect(res.context).toEqual({
        kind: "community_post",
        postId: "po1",
        title: "ขายชีทราคาถูก",
        content: "ทักไลน์มาเลย",
        authorId: "u-student",
        authorName: "นักเรียนเอ",
        removed: false,
      });
    });

    it("returns missing when the post is gone", async () => {
      const resolver = makeResolver({
        communityPost: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      expect(await resolver.resolve("community_post", "nope")).toEqual(MISSING);
    });
  });

  it("returns missing for an unknown target type", async () => {
    const resolver = makeResolver({});
    expect(
      await resolver.resolve("bogus" as ReportTarget, "x"),
    ).toEqual(MISSING);
  });
});
