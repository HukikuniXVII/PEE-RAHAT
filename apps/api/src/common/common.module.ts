import { Global, Module } from "@nestjs/common";

import { AuditLogService } from "./audit-log.service";
import { BypassFilterService } from "./bypass-filter.service";
import { StorageService } from "./storage.service";

@Global()
@Module({
  providers: [AuditLogService, BypassFilterService, StorageService],
  exports: [AuditLogService, BypassFilterService, StorageService],
})
export class CommonModule {}
