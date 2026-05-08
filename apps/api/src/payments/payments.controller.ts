import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { PaymentsService } from "./payments.service";

class CreateIntentDto {
  @IsIn(["booking", "sheet"])
  itemType!: "booking" | "sheet";

  @IsString() itemId!: string;
}

class UploadSlipDto {
  @IsString() paymentIntentId!: string;
  @IsString() slipObjectKey!: string;
}

@Controller("payments")
@UseGuards(SupabaseAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("intents")
  createIntent(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: CreateIntentDto,
  ) {
    return this.payments.createIntent(user.sub, dto);
  }

  @Post("slips")
  uploadSlip(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: UploadSlipDto,
  ) {
    return this.payments.uploadSlip(user.sub, dto);
  }
}
