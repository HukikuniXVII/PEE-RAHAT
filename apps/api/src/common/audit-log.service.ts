import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export type AdminAuditTargetType = "tutor" | "kyc" | "payout";
export type AdminAuditAction = "view_passbook" | "reveal_bank";

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * NFR-05: log every login with IP + timestamp, retain ≥90 days.
   */
  recordLogin(userId: string, ip: string, userAgent?: string): Promise<unknown> {
    return this.prisma.loginAuditLog.create({
      data: { userId, ip, userAgent },
    });
  }

  /**
   * PDPA / Computer Crime Act: record an admin viewing or revealing a
   * sensitive resource (passbook image, decrypted bank account number,
   * payout slip, etc.). Persisted to AdminAuditLog so the action/target
   * columns can be queried directly.
   */
  recordAdminAction(args: {
    adminId: string;
    action: AdminAuditAction;
    targetType: AdminAuditTargetType;
    targetId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<unknown> {
    return this.prisma.adminAuditLog.create({
      data: {
        adminId: args.adminId,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId,
        ip: args.ip,
        userAgent: args.userAgent,
      },
    });
  }
}
