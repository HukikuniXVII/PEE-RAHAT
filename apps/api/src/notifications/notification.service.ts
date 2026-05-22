import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { NotificationItem, NotificationType } from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

export interface NotifyArgs {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Optional in-app deep link. */
  linkUrl?: string | null;
  /** The report this notification is about, if any. */
  reportId?: string | null;
}

/**
 * Minimal in-app notification feed. Built for the report system but kept
 * generic. `notify` is best-effort — a delivery failure is logged, never
 * thrown, so it can't break the report flow that triggered it.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create one in-app notification. Best-effort; swallows + logs errors. */
  async notify(args: NotifyArgs): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: args.userId,
          type: args.type,
          title: args.title,
          body: args.body,
          linkUrl: args.linkUrl ?? null,
          reportId: args.reportId ?? null,
        },
      });
    } catch (e) {
      this.logger.warn(
        `notify(${args.type} → ${args.userId}) failed: ${String(e)}`,
      );
    }
  }

  /** The user's notifications, newest first. */
  async listForUser(supabaseId: string): Promise<NotificationItem[]> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) return [];
    const rows = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      linkUrl: r.linkUrl,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Mark one notification read — scoped to the owner. */
  async markRead(supabaseId: string, id: string): Promise<void> {
    const user = await this.requireUser(supabaseId);
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Mark every unread notification read. */
  async markAllRead(supabaseId: string): Promise<void> {
    const user = await this.requireUser(supabaseId);
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private async requireUser(supabaseId: string): Promise<{ id: string }> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException("Unknown user");
    return user;
  }
}
