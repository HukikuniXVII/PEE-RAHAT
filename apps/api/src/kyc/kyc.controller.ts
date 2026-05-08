import {
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsIn, IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { KycService } from "./kyc.service";

class RequestUploadDto {
  @IsIn(["idPhoto", "selfie", "transcript"])
  field!: "idPhoto" | "selfie" | "transcript";

  @IsString()
  contentType!: string;
}

class SubmitKycDto {
  @IsString() idPhotoKey!: string;
  @IsString() selfieKey!: string;
  @IsString() transcriptKey!: string;
  @IsBoolean() consentPdpaAccepted!: boolean;
}

@Controller("kyc")
@UseGuards(SupabaseAuthGuard)
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post("upload-intents")
  requestUpload(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: RequestUploadDto,
  ) {
    return this.kyc.requestUpload(user.sub, dto.field, dto.contentType);
  }

  @Post("submit")
  submit(@CurrentUser() user: SupabaseJwtPayload, @Body() dto: SubmitKycDto) {
    return this.kyc.submit(user.sub, dto);
  }
}
