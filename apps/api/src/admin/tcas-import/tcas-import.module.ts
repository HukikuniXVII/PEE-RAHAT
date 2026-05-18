import { Module } from "@nestjs/common";

import { TcasAiParserService } from "./ai/tcas-ai-parser.service";
import { TcasImportCache } from "./tcas-import.cache";
import { TcasImportController } from "./tcas-import.controller";

@Module({
  controllers: [TcasImportController],
  providers: [TcasAiParserService, TcasImportCache],
})
export class TcasImportModule {}
