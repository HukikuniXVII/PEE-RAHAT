import { BadRequestException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";

import type { SupabaseAdminService } from "../common/supabase-admin.service";
import type { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

// NFR-04: focused tests on the irreversible executeDeletion transaction —
// the acceptance criteria that matter for PDPA balance (anonymize PII,
// hard-delete sensitive records, keep the row, audit-log, lock out login).

interface PrismaOverrides {
  tutorProfileId?: string | null;
  userExists?: boolean;
}

function makePrisma(over: PrismaOverrides = {}) {
  const tutorProfileId =
    over.tutorProfileId === undefined ? null : over.tutorProfileId;
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(
        over.userExists === false
          ? null
          : {
              id: "u1",
              tutorProfile: tutorProfileId ? { id: tutorProfileId } : null,
            },
      ),
      update: jest.fn().mockResolvedValue({}),
    },
    chatMessage: { deleteMany: jest.fn().mockReturnValue({ op: "chatMsg" }) },
    pushSubscription: { deleteMany: jest.fn().mockReturnValue({ op: "push" }) },
    notificationPreference: {
      deleteMany: jest.fn().mockReturnValue({ op: "notifPref" }),
    },
    tutorProfile: { update: jest.fn().mockReturnValue({ op: "tutor" }) },
    loginAuditLog: { create: jest.fn().mockReturnValue({ op: "audit" }) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new UsersService(
    prisma as unknown as PrismaService,
    {} as JwtService,
    {} as SupabaseAdminService,
  );
}

describe("UsersService.executeDeletion", () => {
  it("anonymizes PII on the surviving User row and stamps deletedAt", async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await service.executeDeletion("u1", "ไม่ได้ใช้แล้ว");

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: "u1" });
    expect(data.email).toBe("deleted-u1@peerahat.deleted");
    expect(data.displayName).toBe("ผู้ใช้ที่ลบบัญชี");
    expect(data.avatarUrl).toBeNull();
    expect(data.deletionReason).toBe("ไม่ได้ใช้แล้ว");
    expect(data.deletedAt).toBeInstanceOf(Date);
    // Year-2099 sentinel locks login as belt-and-suspenders.
    expect((data.suspendedUntil as Date).getUTCFullYear()).toBe(2099);
  });

  it("hard-deletes chat messages, push subscriptions and notification prefs", async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await service.executeDeletion("u1");

    expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: { authorId: "u1" },
    });
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
    expect(prisma.notificationPreference.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
  });

  it("nulls the tutor OAuth token and hides the profile from search", async () => {
    const prisma = makePrisma({ tutorProfileId: "t1" });
    const service = makeService(prisma);

    await service.executeDeletion("u1");

    expect(prisma.tutorProfile.update).toHaveBeenCalledTimes(1);
    const { where, data } = prisma.tutorProfile.update.mock.calls[0][0];
    expect(where).toEqual({ id: "t1" });
    expect(data.googleRefreshToken).toBeNull();
    expect(data.googleEmail).toBeNull();
    expect(data.googleConnectedAt).toBeNull();
    expect(data.hiddenFromSearchAt).toBeInstanceOf(Date);
  });

  it("skips the tutor update for a non-tutor account", async () => {
    const prisma = makePrisma({ tutorProfileId: null });
    const service = makeService(prisma);

    await service.executeDeletion("u1");

    expect(prisma.tutorProfile.update).not.toHaveBeenCalled();
  });

  it("writes an audit-log row and runs everything in one transaction", async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await service.executeDeletion("u1");

    expect(prisma.loginAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        ip: "system",
        userAgent: "account-self-deletion:user=u1",
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = prisma.$transaction.mock.calls[0][0];
    expect(Array.isArray(ops)).toBe(true);
    // chat + push + notifPref + user.update + audit (no tutor row here).
    expect(ops).toHaveLength(5);
  });

  it("throws when the user does not exist", async () => {
    const prisma = makePrisma({ userExists: false });
    const service = makeService(prisma);

    await expect(service.executeDeletion("missing")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
