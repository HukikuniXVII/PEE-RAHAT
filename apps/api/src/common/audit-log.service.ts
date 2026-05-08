import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

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
}
