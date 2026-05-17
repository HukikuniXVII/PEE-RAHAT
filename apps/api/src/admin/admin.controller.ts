import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Ip,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type ComputePayoutsDto,
  computePayoutsSchema,
  type FailPayoutDto,
  failPayoutSchema,
  type GeneratePayoutBatchDto,
  generatePayoutBatchSchema,
  type MarkPayoutTransferredDto,
  markPayoutTransferredSchema,
  type RejectSlipDto,
  rejectSlipSchema,
  type ReviewKycDto,
  reviewKycSchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { PayoutsService } from "../payments/payouts.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(SupabaseAuthGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly payouts: PayoutsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("kyc/queue")
  async kycQueue(@CurrentUser() user: SupabaseJwtPayload) {
    await this.assertAdmin(user.sub);
    return this.admin.kycQueue();
  }

  // FR-TH-02 / PDPA: per-submission detail. Loading this view audit-logs
  // the passbook read (if any) — must stay a separate call from the queue.
  @Get("kyc/:id")
  async kycById(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Ip() ip: string,
  ) {
    const admin = await this.assertAdmin(user.sub);
    return this.admin.kycById(admin.id, id, ip);
  }

  @Post("kyc/:id/review")
  async reviewKyc(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    await this.assertAdmin(user.sub);
    const dto: ReviewKycDto = reviewKycSchema.parse(raw);
    return this.admin.reviewKyc(id, dto.decision, dto.reason);
  }

  @Get("payments/queue")
  async paymentsQueue(
    @CurrentUser() user: SupabaseJwtPayload,
    @Query("status") status?: "pending" | "success" | "failed",
  ) {
    await this.assertAdmin(user.sub);
    return this.admin.paymentsQueue(status);
  }

  // FR-PM-01: manual override on top of SlipOK for slips that need a human
  // (timeouts, foreign-bank transfers, ambiguous evidence).
  @Post("payments/:id/approve")
  async approveSlip(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    await this.assertAdmin(user.sub);
    return this.admin.approveSlip(id);
  }

  @Post("payments/:id/reject")
  async rejectSlip(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    await this.assertAdmin(user.sub);
    const dto: RejectSlipDto = rejectSlipSchema.parse(raw);
    return this.admin.rejectSlip(id, dto.reason);
  }

  @Get("reports")
  async listReports(
    @CurrentUser() user: SupabaseJwtPayload,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: "open" | "resolved",
  ) {
    await this.assertAdmin(user.sub);
    return this.admin.listReports({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Post("reports/:id/resolve")
  async resolveReport(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    await this.assertAdmin(user.sub);
    return this.admin.resolveReport(id);
  }

  // FR-PM-05: dispute freeze. Triggered when a student files Report-Issue
  // within the 24h window — blocks escrow release until admin adjudicates.
  @Post("bookings/:id/freeze")
  async freezeBooking(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    await this.assertAdmin(user.sub);
    return this.admin.freezeBooking(id);
  }

  /**
   * FR-TH-17: admin force-regenerates a booking's Meet link. Used when the
   * inline generator failed at payment-confirm (Calendar outage, etc.) or
   * when the existing link is broken and the class is about to start.
   * Deletes the old Calendar event before minting a new one so attendees'
   * calendars stay clean.
   */
  @Post("bookings/:id/regenerate-meet")
  async regenerateMeet(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    await this.assertAdmin(user.sub);
    return this.admin.regenerateMeet(id);
  }

  /**
   * FR-TH-02: reveal full bank account number for a tutor. Used right
   * before admin makes the manual transfer. Every call writes an audit
   * row so we can prove who saw what.
   */
  @Post("tutors/:id/bank/reveal")
  async revealBank(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") tutorId: string,
    @Ip() ip: string,
  ) {
    const admin = await this.assertAdmin(user.sub);
    return this.admin.revealBank(admin.id, tutorId, ip);
  }

  /**
   * FR-TH-02 / PDPA: standalone passbook block for a tutor, used by the
   * admin tutor-detail page outside of a KYC or payout context. Audit
   * log + 5-min signed URL behavior matches the other passbook reads.
   */
  @Get("tutors/:id/passbook")
  async tutorPassbook(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") tutorId: string,
    @Ip() ip: string,
  ) {
    const admin = await this.assertAdmin(user.sub);
    return this.admin.tutorPassbook(admin.id, tutorId, ip);
  }

  // FR-PM-06 / FR-PM-07: payout batches on the 15th and 30th. Listing is
  // read-only; compute creates Payout rows for every tutor with released
  // escrow inside the period; mark-paid is the manual bank-transfer
  // confirmation step.
  @Get("payouts")
  async listPayouts(
    @CurrentUser() user: SupabaseJwtPayload,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("paid") paid?: string,
  ) {
    await this.assertAdmin(user.sub);
    return this.payouts.list({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      paid: paid === "true" ? true : paid === "false" ? false : undefined,
    });
  }

  @Post("payouts/compute")
  async computePayouts(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    await this.assertAdmin(user.sub);
    const dto: ComputePayoutsDto = computePayoutsSchema.parse(raw);
    return this.payouts.computeForPeriod(
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
    );
  }

  /**
   * FR-PM-06: preview the next batch — released_for_payout intents grouped
   * by tutor, with commission / withholding pre-computed so the admin sees
   * the exact net amount to transfer per row.
   */
  @Get("payouts/queue")
  async payoutQueue(@CurrentUser() user: SupabaseJwtPayload) {
    await this.assertAdmin(user.sub);
    return this.payouts.queue();
  }

  /**
   * FR-PM-06: per-payout detail. Same row shape as the list endpoint but
   * embeds the tutor's current passbook block so the admin can cross-check
   * the bank account before clicking "mark transferred". Loading this
   * view audit-logs the passbook read (if any).
   *
   * Declared AFTER /payouts/queue so Express's first-match routing doesn't
   * eat that static path as `id="queue"`.
   */
  @Get("payouts/:id")
  async payoutById(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Ip() ip: string,
  ) {
    const admin = await this.assertAdmin(user.sub);
    return this.admin.payoutById(admin.id, id, ip);
  }

  /**
   * FR-PM-06: admin clicks "Generate batch for {date}" to aggregate the
   * queue into per-tutor Payout rows. batchDate is typically the 15th or
   * 30th.
   */
  @Post("payouts/generate-batch")
  async generatePayoutBatch(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    await this.assertAdmin(user.sub);
    const dto: GeneratePayoutBatchDto = generatePayoutBatchSchema.parse(raw);
    return this.payouts.generateBatch(new Date(dto.batchDate));
  }

  /**
   * FR-PM-06: admin confirms they've transferred the net amount to the
   * tutor's PromptPay, uploading the proof slip. The Payout row moves to
   * 'completed' and every linked intent flips to 'paid_out'.
   */
  @Post("payouts/:id/mark-transferred")
  async markPayoutTransferred(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    const admin = await this.assertAdmin(user.sub);
    const dto: MarkPayoutTransferredDto = markPayoutTransferredSchema.parse(raw);
    return this.payouts.markTransferred(id, {
      adminUserId: admin.id,
      slipObjectKey: dto.slipObjectKey,
      notes: dto.notes,
    });
  }

  /**
   * FR-PM-06: admin flags a payout as failed (tutor account problem,
   * wrong PromptPay number, etc.). Linked intents are returned to the
   * released_for_payout queue so the next batch picks them up.
   */
  @Post("payouts/:id/fail")
  async failPayout(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
  ) {
    await this.assertAdmin(user.sub);
    const dto: FailPayoutDto = failPayoutSchema.parse(raw);
    return this.payouts.markFailed(id, dto.reason);
  }

  private async assertAdmin(supabaseId: string) {
    const u = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!u || u.role !== "admin") throw new ForbiddenException();
    return u;
  }
}
