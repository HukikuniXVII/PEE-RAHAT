import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type CommunityImageUploadDto,
  communityImageUploadSchema,
  type CreatePostDto,
  createPostSchema,
  createReplySchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import { OptionalSupabaseAuthGuard } from "../auth/optional-auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { StorageService } from "../common/storage.service";
import { CommunityService } from "./community.service";

/** Wire payload for POST /community/posts/:id/replies — postId is the URL
 *  param, body is just content. Picked from the shared createReplySchema. */
const createReplyBodySchema = createReplySchema.pick({ content: true });

@Controller()
export class CommunityController {
  constructor(
    private readonly community: CommunityService,
    private readonly storage: StorageService,
  ) {}

  // Public list. Personalizes hasBookmarked when the viewer is signed in
  // (via OptionalSupabaseAuthGuard); otherwise returns false for everyone.
  @Get("community/posts")
  @UseGuards(OptionalSupabaseAuthGuard)
  list(
    @CurrentUser() user: SupabaseJwtPayload | undefined,
    @Query("page") page?: string,
  ) {
    return this.community.list(user?.sub ?? null, page ? Number(page) : 1);
  }

  @Post("community/posts")
  @UseGuards(SupabaseAuthGuard)
  create(@CurrentUser() user: SupabaseJwtPayload, @Body() raw: unknown) {
    const dto: CreatePostDto = createPostSchema.parse(raw);
    return this.community.create(user.sub, dto);
  }

  // V2 community: sign a PUT for the optional photo attached to a post.
  // Returns the signed uploadUrl + the resolved publicUrl that the
  // client passes back as `imageUrl` on POST /community/posts.
  @Post("community/image-upload-url")
  @UseGuards(SupabaseAuthGuard)
  async signImageUpload(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: CommunityImageUploadDto = communityImageUploadSchema.parse(raw);
    return this.storage.signCommunityImageUpload(user.sub, dto.contentType);
  }

  @Post("community/posts/:id/upvote")
  @UseGuards(SupabaseAuthGuard)
  upvote(@CurrentUser() user: SupabaseJwtPayload, @Param("id") id: string) {
    return this.community.upvote(user.sub, id);
  }

  // V2 community: toggle bookmark. Single endpoint (POST) for both
  // add/remove — the service returns the new boolean state so the client
  // doesn't need to track which verb to call.
  @Post("community/posts/:id/bookmark")
  @UseGuards(SupabaseAuthGuard)
  toggleBookmark(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.community.toggleBookmark(user.sub, id);
  }

  // DELETE alias for the toggle, in case a future client prefers explicit
  // verbs. Behaviour is identical — service is idempotent.
  @Delete("community/posts/:id/bookmark")
  @UseGuards(SupabaseAuthGuard)
  removeBookmark(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.community.toggleBookmark(user.sub, id);
  }

  @Get("community/me/bookmarks")
  @UseGuards(SupabaseAuthGuard)
  myBookmarks(@CurrentUser() user: SupabaseJwtPayload) {
    return this.community.myBookmarks(user.sub);
  }

  @Get("community/trending")
  trending(@Query("limit") limit?: string) {
    const n = limit ? Math.min(20, Math.max(1, Number(limit))) : 5;
    return this.community.trending(n);
  }

  // Mini-profile overlay. Public — anyone reading the feed can open it.
  // Discriminated response (`mode: "tutor" | "student"`) drives which
  // body the frontend renders.
  @Get("community/profile/:userId")
  profile(@Param("userId") userId: string) {
    return this.community.profile(userId);
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
}
