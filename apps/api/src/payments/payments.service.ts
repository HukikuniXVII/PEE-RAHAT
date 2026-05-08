import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreatePaymentIntentDto,
  PaymentIntent,
  SlipVerificationResult,
  UploadSlipDto,
} from "@peerahat/types";
import { addHours } from "date-fns";

import { PrismaService } from "../prisma/prisma.service";
import { SlipOkClient } from "./slip-ok.client";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slipOk: SlipOkClient,
  ) {}

  async createIntent(
    supabaseId: string,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntent> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();

    let amountThb = 0;
    let bookingId: string | null = null;
    let sheetId: string | null = null;

    if (dto.itemType === "booking") {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.itemId },
      });
      if (!booking) throw new NotFoundException();
      if (booking.studentId !== user.id) throw new ForbiddenException();
      if (booking.status !== "accepted") {
        throw new BadRequestException("Booking must be accepted before payment");
      }
      amountThb = booking.amountThb;
      bookingId = booking.id;
    } else {
      const sheet = await this.prisma.studySheet.findUnique({
        where: { id: dto.itemId },
      });
      if (!sheet) throw new NotFoundException();
      if (sheet.isSuspended) throw new BadRequestException("Sheet suspended");
      amountThb = sheet.priceThb;
      sheetId = sheet.id;
    }

    const intent = await this.prisma.paymentIntent.create({
      data: {
        payerId: user.id,
        itemType: dto.itemType,
        bookingId,
        sheetId,
        amountThb,
        promptPayQrPayload: this.buildPromptPayPayload(amountThb),
        expiresAt: addHours(new Date(), 1),
      },
    });

    return {
      id: intent.id,
      itemType: intent.itemType,
      itemId: bookingId ?? sheetId ?? "",
      payerId: intent.payerId,
      amountThb: intent.amountThb,
      promptPayQrPayload: intent.promptPayQrPayload,
      status: intent.status,
      expiresAt: intent.expiresAt.toISOString(),
      createdAt: intent.createdAt.toISOString(),
    };
  }

  async uploadSlip(
    supabaseId: string,
    dto: UploadSlipDto,
  ): Promise<SlipVerificationResult> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: dto.paymentIntentId },
    });
    if (!intent) throw new NotFoundException();
    if (intent.payerId !== user.id) throw new ForbiddenException();

    await this.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { slipObjectKey: dto.slipObjectKey, status: "verifying" },
    });

    const verdict = await this.slipOk.verify(dto.slipObjectKey, intent.amountThb);

    if (!verdict.success || verdict.amountThb !== intent.amountThb) {
      await this.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "failed",
          failureReason: verdict.failureReason ?? "Amount mismatch",
        },
      });
      return {
        paymentIntentId: intent.id,
        status: "failed",
        failureReason: verdict.failureReason ?? "Amount mismatch",
      };
    }

    const updated = await this.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: "held_in_escrow",
        slipOkRef: verdict.slipOkRef,
      },
    });

    if (intent.bookingId) {
      await this.prisma.booking.update({
        where: { id: intent.bookingId },
        data: { status: "paid", reportWindowEndsAt: addHours(new Date(), 24) },
      });
    }

    return {
      paymentIntentId: updated.id,
      status: "held_in_escrow",
      slipOkRef: verdict.slipOkRef,
    };
  }

  private buildPromptPayPayload(amountThb: number): string {
    // TODO: replace with real EMVCo PromptPay payload using merchant ID.
    return `promptpay-stub:amount=${amountThb}`;
  }
}
