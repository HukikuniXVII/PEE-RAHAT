import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifications.controller";
import { NotificationService } from "./notification.service";

/**
 * Minimal in-app notification feed (FR-CM-05). Exports NotificationService
 * so the report modules can emit notifications. PrismaModule is global.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
