import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifications.controller";
import { NotificationsSseController } from "./notifications-sse.controller";
import { NotificationService } from "./notification.service";
import { SseGateway } from "./sse.gateway";

/**
 * In-app notification feed (FR-CM-05 origin, FR-CM-08 rewrite).
 * Exports NotificationService so the report modules + booking
 * modules can emit notifications. PrismaModule is global. SseGateway
 * is also exported because the gateway's state is per-process —
 * tests that mount the module need to inject the same instance to
 * verify SSE writes (no separate test-harness wiring required).
 */
@Module({
  controllers: [NotificationsController, NotificationsSseController],
  providers: [NotificationService, SseGateway],
  exports: [NotificationService, SseGateway],
})
export class NotificationsModule {}
