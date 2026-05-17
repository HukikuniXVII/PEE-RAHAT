import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type CreateSheetDto,
  createSheetSchema,
  type SheetUploadIntentRequestDto,
  sheetUploadIntentRequestSchema,
  sheetReportSchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { SheetsService } from "./sheets.service";

/** Wire payload for POST /sheets/:id/report — sheetId comes from the URL,
 *  body is just reason + details. Picked from the shared sheetReportSchema. */
const sheetReportBodySchema = sheetReportSchema.pick({
  reason: true,
  details: true,
});

@Controller("sheets")
export class SheetsController {
  constructor(private readonly sheets: SheetsService) {}

  @Get()
  list(
    @Query("subject") subject?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.sheets.list({
      subject,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.sheets.findById(id);
  }

  @Post("upload-intents")
  @UseGuards(SupabaseAuthGuard)
  requestUpload(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: SheetUploadIntentRequestDto = sheetUploadIntentRequestSchema.parse(raw);
    return this.sheets.requestUpload(user.sub, dto.kind, dto.contentType);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: CreateSheetDto = createSheetSchema.parse(raw);
    return this.sheets.create(user.sub, dto);
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
    @Body() raw: unknown,
  ) {
    const dto = sheetReportBodySchema.parse(raw);
    return this.sheets.report(user.sub, id, dto);
  }
}
