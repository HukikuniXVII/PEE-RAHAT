import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { CommunityService } from "./community.service";

class CreatePostDto {
  @IsString() title!: string;
  @IsString() content!: string;
  @IsBoolean() consentPdpaAccepted!: boolean;
}

class CreateReplyDto {
  @IsString() content!: string;
}

class ReportDto {
  @IsString() targetType!: "post" | "reply" | "sheet" | "tutor" | "message";
  @IsString() targetId!: string;
  @IsString() reason!: string;
  @IsString() details!: string;
}

@Controller()
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get("community/posts")
  list(@Query("page") page?: string) {
    return this.community.list(page ? Number(page) : 1);
  }

  @Post("community/posts")
  @UseGuards(SupabaseAuthGuard)
  create(@CurrentUser() user: SupabaseJwtPayload, @Body() dto: CreatePostDto) {
    return this.community.create(user.sub, dto);
  }

  @Post("community/posts/:id/upvote")
  @UseGuards(SupabaseAuthGuard)
  upvote(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.community.upvote(user.sub, id);
  }

  @Get("community/posts/:id/replies")
  replies(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.community.replies(
      id,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @Post("community/posts/:id/replies")
  @UseGuards(SupabaseAuthGuard)
  reply(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") postId: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.community.reply(user.sub, postId, dto.content);
  }

  @Post("reports")
  @UseGuards(SupabaseAuthGuard)
  report(@CurrentUser() user: SupabaseJwtPayload, @Body() dto: ReportDto) {
    return this.community.report(user.sub, dto);
  }
}
