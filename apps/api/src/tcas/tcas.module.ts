import { Module } from "@nestjs/common";

import { TcasController } from "./tcas.controller";
import { TcasService } from "./tcas.service";

@Module({
  controllers: [TcasController],
  providers: [TcasService],
})
export class TcasModule {}
