import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifications.controller";
import { NotificationsSseController } from "./notifications-sse.controller";
import { NotificationService } from "./notification.service";
import { PushController } from "./push.controller";
import { SseGateway } from "./sse.gateway";
import { WebPushService } from "./web-push.service";

/**
 * In-app notification feed (FR-CM-05 origin, FR-CM-08 rewrite).
 * Exports NotificationService so the report modules + booking
 * modules can emit notifications. PrismaModule is global. SseGateway
 * is also exported because the gateway's state is per-process —
 * tests that mount the module need to inject the same instance to
 * verify SSE writes (no separate test-harness wiring required).
 *
 * FR-CM-08 Phase 3 adds the WebPushService + PushController
 * (subscribe / devices / test) and lets NotificationService fan
 * notify() calls out to web push as well as SSE.
 */
@Module({
  controllers: [
    NotificationsController,
    NotificationsSseController,
    PushController,
  ],
  providers: [NotificationService, SseGateway, WebPushService],
  exports: [NotificationService, SseGateway, WebPushService],
})
export class NotificationsModule {}
