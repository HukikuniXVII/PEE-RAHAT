import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  type PushDeviceItem,
  type PushSubscriptionInput,
  type PushUnsubscribeDto,
  type VapidPublicKeyResponse,
  pushSubscriptionInputSchema,
  pushUnsubscribeSchema,
} from "@peerahat/types";

import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "./notification.service";
import { WebPushService } from "./web-push.service";

/**
 * FR-CM-08 Phase 3 — endpoints that wire a browser to the push system.
 *
 *   GET    /push/vapid-public-key   — first call from the client.
 *   POST   /push/subscribe          — store one PushSubscription.
 *   DELETE /push/subscribe          — remove by endpoint (revoke / sign-out).
 *   GET    /push/devices            — settings page list.
 *   DELETE /push/devices/:id        — revoke one row.
 *   POST   /push/test               — send a probe to the caller's devices.
 *
 * Endpoint is the unique key — re-subscribing the same browser updates
 * the existing row (lastSeenAt + userId) rather than inserting a
 * duplicate.
 */
@Controller("push")
export class PushController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
    private readonly notifications: NotificationService,
  ) {}

  /** Public — no guard. Browsers need this before they can subscribe. */
  @Get("vapid-public-key")
  getVapidPublicKey(): VapidPublicKeyResponse {
    return { publicKey: this.webPush.getPublicKey() };
  }

  @Post("subscribe")
  @UseGuards(SupabaseAuthGuard)
  async subscribe(
    @CurrentUser() jwt: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<{ ok: true; id: string }> {
    const dto: PushSubscriptionInput = pushSubscriptionInputSchema.parse(raw);
    const user = await this.requireUser(jwt.sub);
    const row = await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        userId: user.id,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
        lastSeenAt: new Date(),
      },
      create: {
        userId: user.id,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
      },
    });
    return { ok: true, id: row.id };
  }

  @Delete("subscribe")
  @UseGuards(SupabaseAuthGuard)
  async unsubscribe(
    @CurrentUser() jwt: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<{ ok: true }> {
    const dto: PushUnsubscribeDto = pushUnsubscribeSchema.parse(raw);
    const user = await this.requireUser(jwt.sub);
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint: dto.endpoint, userId: user.id },
    });
    return { ok: true };
  }

  @Get("devices")
  @UseGuards(SupabaseAuthGuard)
  async listDevices(
    @CurrentUser() jwt: SupabaseJwtPayload,
  ): Promise<PushDeviceItem[]> {
    const user = await this.requireUser(jwt.sub);
    const rows = await this.prisma.pushSubscription.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
    }));
  }

  @Delete("devices/:id")
  @UseGuards(SupabaseAuthGuard)
  async revokeDevice(
    @CurrentUser() jwt: SupabaseJwtPayload,
    @Param("id") id: string,
  ): Promise<{ ok: true }> {
    const user = await this.requireUser(jwt.sub);
    await this.prisma.pushSubscription.deleteMany({
      where: { id, userId: user.id },
    });
    return { ok: true };
  }

  /**
   * Fires a test push to every active subscription on the caller's
   * account. Settings page wires this to a "ส่งทดสอบ" button so users
   * can verify permission + delivery without waiting for a real event.
   * Goes through notify() so dedup + typeOverrides + quiet-hours apply
   * the same way real notifications do.
   */
  @Post("test")
  @UseGuards(SupabaseAuthGuard)
  async sendTest(
    @CurrentUser() jwt: SupabaseJwtPayload,
  ): Promise<{ ok: true }> {
    const user = await this.requireUser(jwt.sub);
    await this.notifications.notify({
      userId: user.id,
      type: "system_test",
      title: "การแจ้งเตือนทดสอบ",
      body: "ถ้าคุณเห็นข้อความนี้ แสดงว่าการแจ้งเตือนของคุณพร้อมใช้งานแล้ว",
      iconKind: "bell",
      actionUrl: "/account/notifications",
    });
    return { ok: true };
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
