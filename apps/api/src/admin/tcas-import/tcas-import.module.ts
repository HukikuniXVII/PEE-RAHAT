import { Module } from "@nestjs/common";

import { TcasImportCache } from "./tcas-import.cache";
import { TcasImportController } from "./tcas-import.controller";
import { TcasImportService } from "./tcas-import.service";

@Module({
  controllers: [TcasImportController],
  providers: [TcasImportService, TcasImportCache],
})
export class TcasImportModule {}
