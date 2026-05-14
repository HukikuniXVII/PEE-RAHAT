import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsInt, IsString, MaxLength, MinLength } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { BookingsService } from "./bookings.service";
import { PostponeService } from "./postpone.service";

class CreateBookingDto {
  @IsString() tutorId!: string;
  @IsString() subject!: string;
  @IsString() scheduledAt!: string;
  @IsInt() durationMinutes!: number;
}

class ReportDto {
  @IsString() reason!: string;
  @IsString() details!: string;
}

class PostponeDto {
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}

class ProposeSlotDto {
  @IsString() scheduledAt!: string;
  @IsInt() durationMinutes!: number;
}

@Controller("bookings")
@UseGuards(SupabaseAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly postpone: PostponeService,
  ) {}

  @Get()
  mine(@CurrentUser() user: SupabaseJwtPayload) {
    return this.bookings.listForUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: SupabaseJwtPayload, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.sub, dto);
  }

  @Post(":id/accept")
  accept(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.bookings.accept(user.sub, id);
  }

  @Post(":id/report")
  report(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: ReportDto,
  ) {
    return this.bookings.report(user.sub, id, dto);
  }

  @Post(":id/postpone")
  postponeInitiate(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: PostponeDto,
  ) {
    return this.postpone.initiate(user.sub, id, dto);
  }

  @Post(":id/postpone/propose")
  postponePropose(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
    @Body() dto: ProposeSlotDto,
  ) {
    return this.postpone.propose(user.sub, id, dto);
  }

  @Post(":id/postpone/confirm")
  postponeConfirm(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.postpone.confirm(user.sub, id);
  }

  @Post(":id/postpone/cancel")
  postponeCancel(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.postpone.cancel(user.sub, id);
  }
}
