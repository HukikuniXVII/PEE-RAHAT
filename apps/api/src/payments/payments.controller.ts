import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  type CreatePaymentIntentDto,
  createPaymentIntentSchema,
  type UploadSlipDto,
  uploadSlipSchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(SupabaseAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("intents")
  createIntent(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: CreatePaymentIntentDto = createPaymentIntentSchema.parse(raw);
    return this.payments.createIntent(user.sub, dto);
  }

  @Post("slips")
  uploadSlip(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: UploadSlipDto = uploadSlipSchema.parse(raw);
    return this.payments.uploadSlip(user.sub, dto);
  }
}
