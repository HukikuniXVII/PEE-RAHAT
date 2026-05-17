import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type CreatePostDto,
  createPostSchema,
  createReplySchema,
  type ReportDto,
  reportSchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { CommunityService } from "./community.service";

/** Wire payload for POST /community/posts/:id/replies — postId is the URL
 *  param, body is just content. Picked from the shared createReplySchema. */
const createReplyBodySchema = createReplySchema.pick({ content: true });

@Controller()
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get("community/posts")
  list(@Query("page") page?: string) {
    return this.community.list(page ? Number(page) : 1);
  }

  @Post("community/posts")
  @UseGuards(SupabaseAuthGuard)
  create(@CurrentUser() user: SupabaseJwtPayload, @Body() raw: unknown) {
    const dto: CreatePostDto = createPostSchema.parse(raw);
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
    @Body() raw: unknown,
  ) {
    const dto = createReplyBodySchema.parse(raw);
    return this.community.reply(user.sub, postId, dto.content);
  }

  @Post("reports")
  @UseGuards(SupabaseAuthGuard)
  report(@CurrentUser() user: SupabaseJwtPayload, @Body() raw: unknown) {
    const dto: ReportDto = reportSchema.parse(raw);
    return this.community.report(user.sub, dto);
  }
}
