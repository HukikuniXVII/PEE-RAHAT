import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { ZercleSlipService } from "./zercle-slip.service";

@Module({
  imports: [CommonModule, PrismaModule],
  providers: [ZercleSlipService],
  exports: [ZercleSlipService],
})
export class ZercleSlipModule {}
