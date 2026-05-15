import {
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { kycSubmitSchema, type KycSubmitDto } from "@peerahat/types";
import { IsIn, IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { KycService } from "./kyc.service";

class RequestUploadDto {
  @IsIn(["idPhoto", "selfie", "transcript", "passbook"])
  field!: "idPhoto" | "selfie" | "transcript" | "passbook";

  @IsString()
  contentType!: string;
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

  /**
   * FR-TH-02 rev: submission shape is governed by the zod schema in
   * @peerahat/types so the bank + passbook + idName fields stay in sync
   * with the client. Validation happens server-side; the controller is
   * a thin pass-through.
   */
  @Post("submit")
  submit(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: KycSubmitDto = kycSubmitSchema.parse(raw);
    return this.kyc.submit(user.sub, dto);
  }
}
