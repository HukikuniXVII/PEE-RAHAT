import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreatePaymentIntentDto,
  PaymentIntent,
  SlipVerificationResult,
  UploadSlipDto,
} from "@peerahat/types";
import { Prisma } from "@prisma/client";
import { addHours } from "date-fns";

import { GoogleMeetService } from "../integrations/google-meet/google-meet.service";
import { PrismaService } from "../prisma/prisma.service";
import { encodePromptPayPayload } from "./promptpay";
import { ZercleSlipService } from "./zercle-slip/zercle-slip.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zercle: ZercleSlipService,
    private readonly googleMeet: GoogleMeetService,
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

      // The schema enforces one PaymentIntent per booking. If an intent
      // already exists (the student reopened the payment dialog), return
      // it rather than re-INSERTing — Prisma would throw P2002 otherwise.
      const existing = await this.prisma.paymentIntent.findUnique({
        where: { bookingId: booking.id },
      });
      if (existing) {
        return {
          id: existing.id,
          itemType: existing.itemType,
          itemId: booking.id,
          payerId: existing.payerId,
          amountThb: existing.amountThb,
          promptPayQrPayload: existing.promptPayQrPayload,
          // `verified` is a deprecated enum value retained for legacy rows;
          // surface it as held_in_escrow which is what it meant before
          // the manual-flow refactor collapsed those two states.
          status:
            existing.status === "verified"
              ? "held_in_escrow"
              : existing.status,
          expiresAt: existing.expiresAt.toISOString(),
          createdAt: existing.createdAt.toISOString(),
        };
      }
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
      // see note above on the deprecated `verified` enum value.
      status: intent.status === "verified" ? "held_in_escrow" : intent.status,
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

    // FR-PM-02: when ZercleSlip is disabled (or not yet provisioned in this
    // environment), every slip is routed to the admin "รออนุมัติ" queue
    // where approveSlip/rejectSlip moves funds into escrow manually. The
    // ZercleSlipService itself returns ok:false in this state — we short-
    // circuit one DB round-trip by checking the flag here.
    if (!this.zercle.isEnabled()) {
      const updated = await this.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          slipObjectKey: dto.slipObjectKey,
          slipUploadedAt: new Date(),
          status: "slip_uploaded",
        },
      });
      return {
        paymentIntentId: updated.id,
        status: "slip_uploaded",
      };
    }

    await this.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        slipObjectKey: dto.slipObjectKey,
        slipUploadedAt: new Date(),
        status: "verifying",
      },
    });

    const verdict = await this.zercle.verify({
      slipObjectKey: dto.slipObjectKey,
      expectedAmountThb: intent.amountThb,
    });

    if (!verdict.ok) {
      await this.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "failed",
          failureReason: verdict.reason,
          // Persist the raw ZercleSlip payload (when present) so the admin
          // queue can show the sender / recipient / amount the slip OCR'd
          // to, even on failures. Cast to Prisma's JSON input shape —
          // the structured interface is strict for callers; Prisma wants
          // an index-signature object.
          zercleResponse:
            verdict.raw === null
              ? undefined
              : (verdict.raw as unknown as Prisma.InputJsonValue),
        },
      });
      return {
        paymentIntentId: intent.id,
        status: "failed",
        failureReason: verdict.reason,
      };
    }

    const updated = await this.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: "held_in_escrow",
        transactionId: verdict.transactionId,
        verifiedAmountThb: verdict.amountThb,
        zercleVerifiedAt: new Date(),
        zercleResponse: verdict.raw as unknown as Prisma.InputJsonValue,
      },
    });

    if (intent.bookingId) {
      const booking = await this.prisma.booking.update({
        where: { id: intent.bookingId },
        data: { status: "paid", reportWindowEndsAt: addHours(new Date(), 24) },
      });
      // FR-TH-17: generate the Meet link inline at payment-confirm. Wrapped
      // in try/catch so a Calendar API outage doesn't roll back the payment
      // — the booking stays paid, and admin can call /admin/bookings/:id/
      // regenerate-meet later.
      await this.tryGenerateMeet(booking.id);
    }

    return {
      paymentIntentId: updated.id,
      status: "held_in_escrow",
      transactionId: verdict.transactionId,
    };
  }

  /**
   * FR-TH-17: best-effort Meet link generation at payment-confirm. Calendar
   * outages, mis-configured service account, or a tutor email Workspace
   * rejects all bubble up here as errors — we log + swallow so payment
   * itself succeeds. Admin retries via /admin/bookings/:id/regenerate-meet.
   *
   * Disabled (GOOGLE_MEET_ENABLED=false): posts the fallback chat message
   * so the student knows to ask the tutor for a link.
   */
  private async tryGenerateMeet(bookingId: string): Promise<void> {
    try {
      if (this.googleMeet.isEnabled()) {
        await this.googleMeet.createForBooking(bookingId);
      } else {
        await this.googleMeet.postFallbackMessage(bookingId);
      }
    } catch (err) {
      this.logger.error(
        `Meet generation failed for booking ${bookingId}: ${(err as Error).message} — admin can retry via /admin/bookings/:id/regenerate-meet`,
      );
    }
  }

  private buildPromptPayPayload(amountThb: number): string {
    const merchantId = process.env.PROMPTPAY_MERCHANT_ID;
    if (!merchantId) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "PROMPTPAY_MERCHANT_ID is not set — cannot generate PromptPay QR. Configure it in the production env (10-digit mobile, 13-digit NID, or 15-digit e-wallet id).",
        );
      }
      // Dev fallback so localhost flows keep working without config.
      // Production throws above so a missing env never silently ships
      // an unscannable QR.
      return `promptpay-stub:amount=${amountThb}`;
    }
    return encodePromptPayPayload({ merchantId, amountThb });
  }

  /**
   * FR-PM-05 / FR-PM-06: once the 24h report window closes without dispute
   * the booking is settled — the class is `completed` and the intent moves
   * to `released_for_payout`, where it waits for the admin to fold it into
   * a payout batch on the 15th / 30th.
   *
   * Disputed intents (admin freeze) are excluded by the `held_in_escrow`
   * filter — they sit at `disputed` until an admin resolves them.
   *
   * This used to flip the intent straight to a `released` status that
   * auto-batched on a cron. Post manual-payments refactor, release-for-
   * payout is the only auto transition; the batch creation is admin-
   * triggered via /admin/payouts/generate-batch.
   */
  async releaseForPayout(now: Date = new Date()): Promise<{ released: number }> {
    const due = await this.prisma.booking.findMany({
      where: {
        status: "paid",
        reportWindowEndsAt: { lte: now },
        paymentIntent: { status: "held_in_escrow" },
      },
      include: { paymentIntent: true },
    });

    let released = 0;
    for (const booking of due) {
      if (!booking.paymentIntent) continue;
      await this.prisma.$transaction([
        this.prisma.paymentIntent.update({
          where: { id: booking.paymentIntent.id },
          data: { status: "released_for_payout", releasedAt: now },
        }),
        this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: "completed" },
        }),
      ]);
      released += 1;
    }
    return { released };
  }
}
