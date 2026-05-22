import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";

import type { StorageService } from "../common/storage.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { ReportPriorityService } from "./report-priority.service";
import type { ReportRateLimitService } from "./report-rate-limit.service";
import { ReportsService } from "./reports.service";
import type { TargetResolverService } from "./target-resolver.service";
import type { TargetResolution } from "./target-resolver.service";

const SLA = new Date("2026-05-24T00:00:00.000Z");

const POST_RESOLUTION: TargetResolution = {
  exists: true,
  ownerUserIds: ["u-owner"],
  bookingId: null,
  context: {
    kind: "community_post",
    postId: "po1",
    title: "t",
    content: "c",
    authorId: "u-owner",
    authorName: "เจ้าของโพสต์",
    removed: false,
  },
};

const BOOKING_RESOLUTION: TargetResolution = {
  exists: true,
  ownerUserIds: ["u-student", "u-tutor"],
  bookingId: "bk1",
  context: {
    kind: "booking",
    bookingId: "bk1",
    subject: "math",
    status: "paid",
    scheduledAt: "2026-06-01T10:00:00.000Z",
    amountThb: 50000,
    escrowStatus: "held_in_escrow",
    tutorDefectCount: 0,
    studentName: "นักเรียน",
    tutorName: "ติวเตอร์",
  },
};

interface Overrides {
  reporterId?: string;
  falseReportCount?: number;
  resolution?: TargetResolution;
  rateLimit?: jest.Mock;
}

function makeService(over: Overrides = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: over.reporterId ?? "u-reporter",
        falseReportCount: over.falseReportCount ?? 0,
      }),
    },
    report: {
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...data, id: "rep-1", status: "pending", slaDeadline: SLA }),
        ),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    reportEvent: {
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: "ev-1",
            createdAt: new Date("2026-05-22T00:00:00.000Z"),
            evidenceKeys: [],
            ...data,
          }),
        ),
    },
  };
  const storage = {
    uploadReportEvidence: jest
      .fn()
      .mockResolvedValue("reports/u-reporter/123-abc.png"),
    signDownload: jest
      .fn()
      .mockResolvedValue({ url: "https://signed.example/x", expiresAt: "x" }),
  };
  const targetResolver = {
    resolve: jest.fn().mockResolvedValue(over.resolution ?? POST_RESOLUTION),
  };
  const priority = {
    compute: jest
      .fn()
      .mockReturnValue({ priority: "normal", slaDeadline: SLA }),
    slaDeadlineFor: jest.fn().mockReturnValue(SLA),
  };
  const rateLimit = {
    assertCanFile: over.rateLimit ?? jest.fn().mockResolvedValue(undefined),
  };
  const svc = new ReportsService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
    targetResolver as unknown as TargetResolverService,
    priority as unknown as ReportPriorityService,
    rateLimit as unknown as ReportRateLimitService,
  );
  return { svc, prisma, storage, targetResolver, priority, rateLimit };
}

const POST_DTO = {
  targetType: "community_post" as const,
  targetId: "po1",
  category: "spam" as const,
  description: "x".repeat(25),
  evidenceKeys: [] as string[],
};

describe("ReportsService.create (FR-CM-05 / FR-SM-07 / FR-PM-05)", () => {
  it("files a report and returns id / status / slaDeadline", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.create("sup-reporter", POST_DTO);
    expect(result).toEqual({
      id: "rep-1",
      status: "pending",
      slaDeadline: SLA.toISOString(),
    });
    // targetUserId resolves to the content owner (not the reporter).
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reporterId: "u-reporter",
        targetUserId: "u-owner",
        priority: "normal",
        slaDeadline: SLA,
        linkedBookingId: null,
      }),
    });
  });

  it("404s when the target does not exist", async () => {
    const { svc } = makeService({
      resolution: {
        exists: false,
        ownerUserIds: [],
        bookingId: null,
        context: { kind: "missing" },
      },
    });
    await expect(svc.create("sup-reporter", POST_DTO)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects reporting your own content", async () => {
    // reporter IS the post owner.
    const { svc } = makeService({ reporterId: "u-owner" });
    await expect(svc.create("sup-reporter", POST_DTO)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("allows a booking party to report — and picks the other party as target", async () => {
    // reporter is the student; the self-report guard is skipped for bookings.
    const { svc, prisma, priority } = makeService({
      reporterId: "u-student",
      resolution: BOOKING_RESOLUTION,
    });
    await svc.create("sup-student", {
      targetType: "booking",
      targetId: "bk1",
      category: "no_show",
      description: "x".repeat(25),
      evidenceKeys: [],
    });
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetUserId: "u-tutor",
        linkedBookingId: "bk1",
      }),
    });
    // booking status + schedule are forwarded to the priority service.
    expect(priority.compute).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          type: "booking",
          bookingStatus: "paid",
          bookingScheduledAt: new Date("2026-06-01T10:00:00.000Z"),
        },
      }),
    );
  });

  it("rejects evidence keys not owned by the reporter", async () => {
    const { svc } = makeService();
    await expect(
      svc.create("sup-reporter", {
        ...POST_DTO,
        evidenceKeys: ["reports/someone-else/evil.png"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("propagates a 429 from the rate limiter", async () => {
    const { svc } = makeService({
      rateLimit: jest
        .fn()
        .mockRejectedValue(
          new HttpException("คุณรายงานบ่อยเกินไป", HttpStatus.TOO_MANY_REQUESTS),
        ),
    });
    await expect(svc.create("sup-reporter", POST_DTO)).rejects.toThrow(
      /รายงานบ่อยเกินไป/,
    );
  });
});

describe("ReportsService.create — chat-bypass auto-detection (FR-CM-05)", () => {
  const chatResolution = (bypassMatch: boolean): TargetResolution => ({
    exists: true,
    ownerUserIds: ["u-sender"],
    bookingId: "bk1",
    context: {
      kind: "chat_message",
      messageId: "m1",
      bookingId: "bk1",
      bypassMatch,
      thread: [],
    },
  });

  const chatDto = (category: "other" | "scam") => ({
    targetType: "chat_message" as const,
    targetId: "m1",
    category,
    description: "x".repeat(25),
    evidenceKeys: [] as string[],
  });

  it("forces off_platform_solicitation + high priority on a flagged message", async () => {
    const { svc, prisma } = makeService({ resolution: chatResolution(true) });
    await svc.create("sup-reporter", chatDto("other"));
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: "off_platform_solicitation",
        priority: "high",
      }),
    });
  });

  it("keeps a more specific category but still bumps priority to high", async () => {
    const { svc, prisma } = makeService({ resolution: chatResolution(true) });
    await svc.create("sup-reporter", chatDto("scam"));
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ category: "scam", priority: "high" }),
    });
  });

  it("leaves category + priority untouched when no bypass was detected", async () => {
    const { svc, prisma } = makeService({ resolution: chatResolution(false) });
    await svc.create("sup-reporter", chatDto("other"));
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ category: "other", priority: "normal" }),
    });
  });
});

describe("ReportsService — reporter read endpoints (FR-CM-05)", () => {
  const reportRow = (over: Record<string, unknown> = {}) => ({
    id: "rep-1",
    reporterId: "u-reporter",
    targetType: "community_post",
    targetId: "po1",
    category: "spam",
    description: "d".repeat(25),
    evidenceKeys: ["reports/u-reporter/a.png"],
    status: "under_review",
    slaDeadline: SLA,
    createdAt: new Date("2026-05-20T00:00:00.000Z"),
    resolvedAt: null,
    resolution: null,
    publicResponse: null,
    events: [],
    ...over,
  });

  it("listMine maps the reporter's rows newest-first", async () => {
    const { svc, prisma } = makeService();
    prisma.report.findMany.mockResolvedValue([
      reportRow({ id: "rep-2" }),
      reportRow({ id: "rep-1" }),
    ]);
    const list = await svc.listMine("sup-reporter");
    expect(list.map((r) => r.id)).toEqual(["rep-2", "rep-1"]);
    expect(prisma.report.findMany).toHaveBeenCalledWith({
      where: { reporterId: "u-reporter" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("getMineDetail strips admin-only notes from the timeline", async () => {
    const { svc, prisma } = makeService();
    prisma.report.findUnique.mockResolvedValue(
      reportRow({
        events: [
          {
            id: "e1",
            kind: "reporter_comment",
            text: "เพิ่มหลักฐาน",
            evidenceKeys: [],
            createdAt: new Date("2026-05-21T00:00:00.000Z"),
          },
          {
            id: "e2",
            kind: "admin_note",
            text: "internal only",
            evidenceKeys: [],
            createdAt: new Date("2026-05-21T01:00:00.000Z"),
          },
        ],
      }),
    );
    const detail = await svc.getMineDetail("sup-reporter", "rep-1");
    expect(detail.events).toHaveLength(1);
    expect(detail.events[0]).toMatchObject({ id: "e1", authorLabel: "คุณ" });
    expect(detail.canComment).toBe(true);
  });

  it("getMineDetail rejects another reporter's report", async () => {
    const { svc, prisma } = makeService();
    prisma.report.findUnique.mockResolvedValue(
      reportRow({ reporterId: "someone-else" }),
    );
    await expect(
      svc.getMineDetail("sup-reporter", "rep-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("getMineDetail 404s a missing report", async () => {
    const { svc } = makeService();
    await expect(
      svc.getMineDetail("sup-reporter", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("addComment appends a reporter_comment event on an open report", async () => {
    const { svc, prisma } = makeService();
    prisma.report.findUnique.mockResolvedValue(reportRow());
    await svc.addComment("sup-reporter", "rep-1", {
      text: "มีหลักฐานเพิ่ม",
      evidenceKeys: [],
    });
    expect(prisma.reportEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reportId: "rep-1",
        kind: "reporter_comment",
        authorId: "u-reporter",
        text: "มีหลักฐานเพิ่ม",
      }),
    });
  });

  it("addComment rejects a closed report", async () => {
    const { svc, prisma } = makeService();
    prisma.report.findUnique.mockResolvedValue(reportRow({ status: "resolved" }));
    await expect(
      svc.addComment("sup-reporter", "rep-1", { text: "x", evidenceKeys: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("addComment rejects a comment on another reporter's report", async () => {
    const { svc, prisma } = makeService();
    prisma.report.findUnique.mockResolvedValue(
      reportRow({ reporterId: "someone-else" }),
    );
    await expect(
      svc.addComment("sup-reporter", "rep-1", { text: "x", evidenceKeys: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("ReportsService.uploadEvidence", () => {
  const file = (over: Partial<{ mimetype: string; size: number }>) => ({
    buffer: Buffer.from("data"),
    mimetype: over.mimetype ?? "image/png",
    size: over.size ?? 1024,
  });

  it("uploads an allowed file and returns its object key", async () => {
    const { svc, storage } = makeService();
    const result = await svc.uploadEvidence("sup-reporter", file({}));
    expect(result).toEqual({ objectKey: "reports/u-reporter/123-abc.png" });
    expect(storage.uploadReportEvidence).toHaveBeenCalled();
  });

  it("rejects a missing file", async () => {
    const { svc } = makeService();
    await expect(
      svc.uploadEvidence("sup-reporter", undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a disallowed MIME type", async () => {
    const { svc } = makeService();
    await expect(
      svc.uploadEvidence("sup-reporter", file({ mimetype: "application/zip" })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a file over the size limit", async () => {
    const { svc } = makeService();
    await expect(
      svc.uploadEvidence(
        "sup-reporter",
        file({ size: 11 * 1024 * 1024 }),
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
