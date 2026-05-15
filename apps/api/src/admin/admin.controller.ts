import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { PayoutsService } from "../payments/payouts.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminService } from "./admin.service";

class ReviewKycDto {
  @IsIn(["approve", "reject"]) decision!: "approve" | "reject";
  @IsOptional()
  @IsString()
  reason?: string;
}

class RejectSlipDto {
  @IsString() reason!: string;
}

class ComputePayoutsDto {
  @IsString() periodStart!: string;
  @IsString() periodEnd!: string;
}

class GeneratePayoutBatchDto {
  @IsString() batchDate!: string;
}

class MarkPayoutTransferredDto {
  @IsString() slipObjectKey!: string;
  @IsOptional()
  @IsString()
  notes?: string;
}

class FailPayoutDto {
  @IsString() reason!: string;
}

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

  @Post("kyc/:id/review")
  async reviewKyc(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: ReviewKycDto,
  ) {
    await this.assertAdmin(user.sub);
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
    @Body() dto: RejectSlipDto,
  ) {
    await this.assertAdmin(user.sub);
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
    @Body() dto: ComputePayoutsDto,
  ) {
    await this.assertAdmin(user.sub);
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
   * FR-PM-06: admin clicks "Generate batch for {date}" to aggregate the
   * queue into per-tutor Payout rows. batchDate is typically the 15th or
   * 30th.
   */
  @Post("payouts/generate-batch")
  async generatePayoutBatch(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: GeneratePayoutBatchDto,
  ) {
    await this.assertAdmin(user.sub);
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
    @Body() dto: MarkPayoutTransferredDto,
  ) {
    const admin = await this.assertAdmin(user.sub);
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
    @Body() dto: FailPayoutDto,
  ) {
    await this.assertAdmin(user.sub);
    return this.payouts.markFailed(id, dto.reason);
  }

  private async assertAdmin(supabaseId: string) {
    const u = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!u || u.role !== "admin") throw new ForbiddenException();
    return u;
  }
}
