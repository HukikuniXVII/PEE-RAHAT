import { Global, Module } from "@nestjs/common";

import { AuditLogService } from "./audit-log.service";
import { BypassFilterService } from "./bypass-filter.service";
import { CryptoService } from "./crypto.service";
import { StorageService } from "./storage.service";
import { SupabaseAdminService } from "./supabase-admin.service";

@Global()
@Module({
  providers: [
    AuditLogService,
    BypassFilterService,
    CryptoService,
    StorageService,
    SupabaseAdminService,
  ],
  exports: [
    AuditLogService,
    BypassFilterService,
    CryptoService,
    StorageService,
    SupabaseAdminService,
  ],
})
export class CommonModule {}
