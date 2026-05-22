import { Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { NotificationService } from "./notification.service";

/** In-app notification feed for the signed-in user. */
@Controller("notifications")
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentUser() user: SupabaseJwtPayload) {
    return this.notifications.listForUser(user.sub);
  }

  @Patch(":id/read")
  async markRead(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    await this.notifications.markRead(user.sub, id);
    return { ok: true };
  }

  @Post("read-all")
  async markAllRead(@CurrentUser() user: SupabaseJwtPayload) {
    await this.notifications.markAllRead(user.sub);
    return { ok: true };
  }
}
