import type { StorageService } from "../common/storage.service";
import type { NotificationService } from "../notifications/notification.service";
import type { PrismaService } from "../prisma/prisma.service";
import { ReportCronService } from "./report-cron.service";

function build() {
  const prisma = {
    report: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    reportEvent: { updateMany: jest.fn().mockResolvedValue({}) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((arg: unknown[]) => Promise.all(arg)),
  };
  const notifications = { notify: jest.fn().mockResolvedValue(undefined) };
  const storage = { deleteObject: jest.fn().mockResolvedValue(undefined) };
  const svc = new ReportCronService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationService,
    storage as unknown as StorageService,
  );
  return { svc, prisma, notifications, storage };
}

describe("ReportCronService (FR-CM-05)", () => {
  describe("slaCheck", () => {
    it("pings the assignee of a just-overdue report", async () => {
      const { svc, prisma, notifications } = build();
      prisma.report.findMany.mockResolvedValue([
        { id: "r1", assignedToId: "admin-x", priority: "high" },
      ]);
      const result = await svc.slaCheck();
      expect(result.pinged).toBe(1);
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "report_sla_overdue",
          userId: "admin-x",
        }),
      );
    });

    it("escalates an unassigned overdue report to urgent and alerts admins", async () => {
      const { svc, prisma, notifications } = build();
      prisma.report.findMany.mockResolvedValue([
        { id: "r2", assignedToId: null, priority: "normal" },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: "admin-1" },
        { id: "admin-2" },
      ]);
      const result = await svc.slaCheck();
      expect(result.escalated).toBe(1);
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: "r2" },
        data: { priority: "urgent" },
      });
      expect(notifications.notify).toHaveBeenCalledTimes(2);
    });

    it("does not re-escalate a report already at urgent", async () => {
      const { svc, prisma } = build();
      prisma.report.findMany.mockResolvedValue([
        { id: "r3", assignedToId: null, priority: "urgent" },
      ]);
      prisma.user.findMany.mockResolvedValue([{ id: "admin-1" }]);
      await svc.slaCheck();
      expect(prisma.report.update).not.toHaveBeenCalled();
    });
  });

  describe("staleCleanup", () => {
    it("auto-rejects pending reports past the stale window", async () => {
      const { svc, prisma } = build();
      prisma.report.updateMany.mockResolvedValue({ count: 4 });
      const result = await svc.staleCleanup();
      expect(result.rejected).toBe(4);
      expect(prisma.report.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "pending" }),
          data: expect.objectContaining({
            status: "rejected",
            resolutionNote: "เกินกำหนดการตอบกลับ",
          }),
        }),
      );
    });
  });

  describe("evidenceCleanup", () => {
    it("deletes evidence files and clears the keys", async () => {
      const { svc, prisma, storage } = build();
      prisma.report.findMany.mockResolvedValue([
        {
          id: "r1",
          evidenceKeys: ["reports/u/a.png"],
          events: [{ id: "e1", evidenceKeys: ["reports/u/b.png"] }],
        },
      ]);
      const result = await svc.evidenceCleanup();
      expect(result.purged).toBe(2);
      expect(storage.deleteObject).toHaveBeenCalledWith("reports/u/a.png");
      expect(storage.deleteObject).toHaveBeenCalledWith("reports/u/b.png");
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { evidenceKeys: [] },
      });
    });
  });
});
