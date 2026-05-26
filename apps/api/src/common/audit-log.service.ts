import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export type AdminAuditTargetType = "tutor" | "kyc" | "payout" | "report";
export type AdminAuditAction =
  | "view_passbook"
  | "reveal_bank"
  | "assign_report"
  | "update_report_status"
  | "resolve_report"
  | "mark_report_duplicate"
  | "add_report_note";

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * NFR-05: log every login with IP + timestamp, retain ≥90 days.
   */
  async recordLogin(
    userId: string,
    ip: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.loginAuditLog.create({
      data: { userId, ip, userAgent },
    });
  }

  /**
   * PDPA / Computer Crime Act: record an admin viewing or revealing a
   * sensitive resource (passbook image, decrypted bank account number,
   * payout slip, etc.). Persisted to AdminAuditLog so the action/target
   * columns can be queried directly.
   */
  async recordAdminAction(args: {
    adminId: string;
    action: AdminAuditAction;
    targetType: AdminAuditTargetType;
    targetId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.adminAuditLog.create({
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
