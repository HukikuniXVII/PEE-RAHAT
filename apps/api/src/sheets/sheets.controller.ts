import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { SheetsService } from "./sheets.service";

class ReportDto {
  @IsIn(["copyright", "fraud", "lowQuality", "other"])
  reason!: "copyright" | "fraud" | "lowQuality" | "other";

  @IsString() details!: string;
}

@Controller("sheets")
export class SheetsController {
  constructor(private readonly sheets: SheetsService) {}

  @Get()
  list(@Query("subject") subject?: string, @Query("q") q?: string) {
    return this.sheets.list({ subject, q });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.sheets.findById(id);
  }

  @Post(":id/download")
  @UseGuards(SupabaseAuthGuard)
  download(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.sheets.issueDownload(user.sub, id);
  }

  @Post(":id/report")
  @UseGuards(SupabaseAuthGuard)
  report(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: ReportDto,
  ) {
    return this.sheets.report(user.sub, id, dto);
  }
}
