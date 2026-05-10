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
import { IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { AdminService } from "./admin.service";

class ReviewKycDto {
  @IsString() decision!: "approve" | "reject";
  @IsString() reason?: string;
}

class RejectSlipDto {
  @IsString() reason!: string;
}

@Controller("admin")
@UseGuards(SupabaseAuthGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
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
  async paymentsQueue(@CurrentUser() user: SupabaseJwtPayload) {
    await this.assertAdmin(user.sub);
    return this.admin.paymentsQueue();
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

  private async assertAdmin(supabaseId: string) {
    const u = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!u || u.role !== "admin") throw new ForbiddenException();
  }
}
