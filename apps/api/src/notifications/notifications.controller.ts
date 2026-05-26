import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type UpdateNotificationPreferenceDto,
  updateNotificationPreferenceSchema,
} from "@peerahat/types";

import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { NotificationService } from "./notification.service";

/** In-app notification feed + per-user preferences for the signed-in user. */
@Controller("notifications")
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  /**
   * FR-CM-08 — paginated feed. `?limit=20&before=<createdAtIso>` for
   * the bell panel's infinite scroll. Defaults: limit=20, no cursor
   * (newest page).
   */
  @Get()
  list(
    @CurrentUser() user: SupabaseJwtPayload,
    @Query("limit") limit?: string,
    @Query("before") before?: string,
  ) {
    return this.notifications.list(user.sub, {
      limit: limit ? Number(limit) : undefined,
      before: before ?? null,
    });
  }

  /** FR-CM-08 — small endpoint just for the bell badge. */
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: SupabaseJwtPayload) {
    const count = await this.notifications.unreadCount(user.sub);
    return { count };
  }

  /** FR-CM-08 — settings page reads + writes. */
  @Get("preferences")
  getPreferences(@CurrentUser() user: SupabaseJwtPayload) {
    return this.notifications.getPreferences(user.sub);
  }

  @Patch("preferences")
  updatePreferences(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: UpdateNotificationPreferenceDto =
      updateNotificationPreferenceSchema.parse(raw);
    return this.notifications.updatePreferences(user.sub, dto);
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
