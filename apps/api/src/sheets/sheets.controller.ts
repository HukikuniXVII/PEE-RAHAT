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
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { SheetsService } from "./sheets.service";

class ReportDto {
  @IsIn(["copyright", "fraud", "lowQuality", "other"])
  reason!: "copyright" | "fraud" | "lowQuality" | "other";

  @IsString() details!: string;
}

class RequestUploadDto {
  @IsIn(["pdf", "preview"]) kind!: "pdf" | "preview";
  @IsString() contentType!: string;
}

class CreateSheetDto {
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsString() @MinLength(10) @MaxLength(5000) description!: string;
  @IsString() subject!: string;
  @IsInt() @Min(0) @Max(100_000) priceThb!: number;
  @IsString() pdfObjectKey!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(8)
  @IsString({ each: true })
  previewImageObjectKeys!: string[];
  @IsOptional() @IsUrl() introVideoUrl?: string;
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

  @Post("upload-intents")
  @UseGuards(SupabaseAuthGuard)
  requestUpload(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: RequestUploadDto,
  ) {
    return this.sheets.requestUpload(user.sub, dto.kind, dto.contentType);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: CreateSheetDto,
  ) {
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
    @Body() dto: ReportDto,
  ) {
    return this.sheets.report(user.sub, id, dto);
  }
}
