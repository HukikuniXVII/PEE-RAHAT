import { BadRequestException } from "@nestjs/common";

import type { AuditLogService } from "../common/audit-log.service";
import type { StorageService } from "../common/storage.service";
import type { PrismaService } from "../prisma/prisma.service";
import { AdminReportsService } from "./admin-reports.service";
import type { ReportResolutionService } from "./report-resolution.service";
import type { TargetResolverService } from "./target-resolver.service";

interface Mocks {
  prisma: Record<string, unknown> & {
    $transaction: jest.Mock;
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    report: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
    };
    reportEvent: { create: jest.Mock };
  };
  resolution: { execute: jest.Mock };
  audit: { recordAdminAction: jest.Mock };
}

function build(): { svc: AdminReportsService } & Mocks {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "admin-1" }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    report: {
      findUnique: jest.fn().mockResolvedValue({ id: "rep-1" }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    reportEvent: { create: jest.fn().mockResolvedValue({}) },
  } as Mocks["prisma"];
  prisma.$transaction = jest.fn((arg: unknown) =>
    Array.isArray(arg)
      ? Promise.all(arg)
      : (arg as (tx: unknown) => Promise<unknown>)(prisma),
  );
  const resolution = { execute: jest.fn().mockResolvedValue(undefined) };
  const audit = { recordAdminAction: jest.fn().mockResolvedValue({}) };
  const targetResolver = { resolve: jest.fn() };
  const storage = { signDownload: jest.fn() };
  const svc = new AdminReportsService(
    prisma as unknown as PrismaService,
    targetResolver as unknown as TargetResolverService,
    resolution as unknown as ReportResolutionService,
    audit as unknown as AuditLogService,
    storage as unknown as StorageService,
  );
  return { svc, prisma, resolution, audit };
}

describe("AdminReportsService (FR-CM-05)", () => {
  describe("queue", () => {
    it("orders by priority desc then slaDeadline asc", async () => {
      const { svc, prisma } = build();
      await svc.queue({});
      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ priority: "desc" }, { slaDeadline: "asc" }],
        }),
      );
    });

    it("flags a chat-message off-platform report as a bypass hit", async () => {
      const { svc, prisma } = build();
      prisma.report.findMany.mockResolvedValue([
        {
          id: "r1",
          reporterId: "u1",
          targetType: "chat_message",
          category: "off_platform_solicitation",
          priority: "high",
          status: "pending",
          slaDeadline: new Date("2026-06-01T00:00:00Z"),
          createdAt: new Date("2026-05-22T00:00:00Z"),
          assignedToId: null,
          description: "d",
        },
      ]);
      const items = await svc.queue({});
      expect(items[0]?.bypassFlagged).toBe(true);
    });
  });

  describe("assign", () => {
    it("rejects an assignee who is not an admin", async () => {
      const { svc, prisma } = build();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "admin-1" }) // requireAdmin
        .mockResolvedValueOnce({ displayName: "X", role: "student" }); // assignee
      await expect(
        svc.assign("sup-admin", "rep-1", "not-admin"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("assigns and audit-logs the action", async () => {
      const { svc, prisma, audit } = build();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "admin-1" })
        .mockResolvedValueOnce({ displayName: "พี่แอด", role: "admin" });
      await svc.assign("sup-admin", "rep-1", "admin-2", "1.2.3.4");
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: "rep-1" },
        data: { assignedToId: "admin-2" },
      });
      expect(audit.recordAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "assign_report",
          targetType: "report",
          targetId: "rep-1",
        }),
      );
    });
  });

  describe("resolve", () => {
    it("delegates to the resolution service and audit-logs", async () => {
      const { svc, resolution, audit } = build();
      const dto = { resolution: "no_action", resolutionNote: "ok" } as never;
      await svc.resolve("sup-admin", "rep-1", dto, "1.2.3.4");
      expect(resolution.execute).toHaveBeenCalledWith({
        reportId: "rep-1",
        executedBy: "admin-1",
        dto,
      });
      expect(audit.recordAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: "resolve_report" }),
      );
    });
  });

  describe("markDuplicate", () => {
    it("rejects marking a report as a duplicate of itself", async () => {
      const { svc } = build();
      await expect(
        svc.markDuplicate("sup-admin", "rep-1", "rep-1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("clusters the report and audit-logs", async () => {
      const { svc, prisma, audit } = build();
      await svc.markDuplicate("sup-admin", "rep-1", "rep-parent");
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: "rep-1" },
        data: { status: "duplicate", parentReportId: "rep-parent" },
      });
      expect(audit.recordAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: "mark_report_duplicate" }),
      );
    });
  });

  describe("addNote", () => {
    it("creates an admin_note event and audit-logs", async () => {
      const { svc, prisma, audit } = build();
      await svc.addNote("sup-admin", "rep-1", "ภายใน: รอหลักฐานเพิ่ม");
      expect(prisma.reportEvent.create).toHaveBeenCalledWith({
        data: {
          reportId: "rep-1",
          kind: "admin_note",
          authorId: "admin-1",
          text: "ภายใน: รอหลักฐานเพิ่ม",
        },
      });
      expect(audit.recordAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: "add_report_note" }),
      );
    });
  });
});
