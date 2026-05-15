import { Global, Module } from "@nestjs/common";

import { AuditLogService } from "./audit-log.service";
import { BypassFilterService } from "./bypass-filter.service";
import { CryptoService } from "./crypto.service";
import { StorageService } from "./storage.service";

@Global()
@Module({
  providers: [AuditLogService, BypassFilterService, CryptoService, StorageService],
  exports: [AuditLogService, BypassFilterService, CryptoService, StorageService],
})
export class CommonModule {}
