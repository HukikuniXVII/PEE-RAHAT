import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  type CreatePaymentIntentDto,
  createPaymentIntentSchema,
  type SlipRequestUploadDto,
  slipRequestUploadSchema,
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

  // FR-PM-01: signed PUT for slip upload — must be called BEFORE
  // POST /payments/slips so the frontend has a real objectKey to send.
  @Post("slips/upload-url")
  requestSlipUpload(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: SlipRequestUploadDto = slipRequestUploadSchema.parse(raw);
    return this.payments.requestSlipUpload(user.sub, dto);
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
