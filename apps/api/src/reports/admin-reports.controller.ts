import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type AddReportNoteDto,
  addReportNoteSchema,
  type AssignReportDto,
  assignReportSchema,
  type MarkDuplicateDto,
  markDuplicateSchema,
  reportPrioritySchema,
  reportStatusSchema,
  reportTargetSchema,
  type ResolveReportDto,
  resolveReportSchema,
  type UpdateReportStatusDto,
  updateReportStatusSchema,
} from "@peerahat/types";

import { AdminGuard } from "../auth/admin.guard";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { AdminReportsService } from "./admin-reports.service";

/**
 * Admin report surface (FR-CM-05 / FR-SM-07 / FR-PM-05). Every route is
 * admin-gated; the mutating ones write an AdminAuditLog row in the service.
 */
@Controller("admin/reports")
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AdminReportsController {
  constructor(private readonly admin: AdminReportsService) {}

  // Literal segments are declared before `:id` so they win the match.
  @Get("queue")
  queue(
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("targetType") targetType?: string,
    @Query("assignedToId") assignedToId?: string,
  ) {
    return this.admin.queue({
      status: status ? reportStatusSchema.parse(status) : undefined,
      priority: priority ? reportPrioritySchema.parse(priority) : undefined,
      targetType: targetType
        ? reportTargetSchema.parse(targetType)
        : undefined,
      assignedToId: assignedToId || undefined,
    });
  }

  @Get("overdue")
  overdue() {
    return this.admin.overdue();
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.admin.detail(id);
  }

  @Get(":id/related")
  related(@Param("id") id: string) {
    return this.admin.related(id);
  }

  @Patch(":id/assign")
  async assign(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
    @Ip() ip: string,
  ) {
    const dto: AssignReportDto = assignReportSchema.parse(raw);
    await this.admin.assign(user.sub, id, dto.adminId, ip);
    return { ok: true };
  }

  @Patch(":id/status")
  async updateStatus(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
    @Ip() ip: string,
  ) {
    const dto: UpdateReportStatusDto = updateReportStatusSchema.parse(raw);
    await this.admin.updateStatus(user.sub, id, dto.status, dto.note, ip);
    return { ok: true };
  }

  @Post(":id/resolve")
  async resolve(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
    @Ip() ip: string,
  ) {
    const dto: ResolveReportDto = resolveReportSchema.parse(raw);
    await this.admin.resolve(user.sub, id, dto, ip);
    return { ok: true };
  }

  @Post(":id/duplicate-of")
  async duplicateOf(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
    @Ip() ip: string,
  ) {
    const dto: MarkDuplicateDto = markDuplicateSchema.parse(raw);
    await this.admin.markDuplicate(user.sub, id, dto.parentReportId, ip);
    return { ok: true };
  }

  @Post(":id/note")
  async addNote(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() raw: unknown,
    @Ip() ip: string,
  ) {
    const dto: AddReportNoteDto = addReportNoteSchema.parse(raw);
    await this.admin.addNote(user.sub, id, dto.text, ip);
    return { ok: true };
  }
}
