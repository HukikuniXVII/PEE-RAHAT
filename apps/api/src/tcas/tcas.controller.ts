import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import type { TcasScores } from "@peerahat/types";

import { TcasService } from "./tcas.service";

@Controller("tcas")
export class TcasController {
  constructor(private readonly tcas: TcasService) {}

  @Get("programs")
  programs(@Query("round") round?: string) {
    return this.tcas.listPrograms(round);
  }

  @Get("deadlines")
  deadlines() {
    return this.tcas.listDeadlines();
  }

  @Post("what-if")
  whatIf(@Body() body: { programId: string; scores: TcasScores }) {
    return this.tcas.whatIf(body.programId, body.scores);
  }
}
