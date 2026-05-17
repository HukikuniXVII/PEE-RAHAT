import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  type AvatarIntentDto,
  avatarIntentSchema,
  type AvatarUploadIntent,
  type User,
  type UserProfileUpdateDto,
  userProfileUpdateSchema,
  type UserRole,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { StorageService } from "../common/storage.service";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Idempotent: ensures the local User row exists for the calling Supabase
   * principal and returns it. Called by the web app right after sign-in /
   * sign-up so subsequent feature endpoints can do findUnique without
   * worrying about whether the row has been materialised yet.
   */
  @Get("me")
  async me(@CurrentUser() user: SupabaseJwtPayload): Promise<User> {
    const displayNameFromMeta =
      typeof user.user_metadata?.displayName === "string"
        ? (user.user_metadata.displayName as string)
        : null;
    const fallbackName = user.email?.split("@")[0] ?? "Pee Rahat User";
    const row = await this.users.findOrCreateBySupabase({
      supabaseId: user.sub,
      email: user.email,
      displayName: displayNameFromMeta ?? fallbackName,
    });
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role as UserRole,
      avatarUrl: row.avatarUrl ?? undefined,
      createdAt: row.createdAt.toISOString(),
      tutorProfileId: row.tutorProfile?.id,
    };
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<User> {
    const dto: UserProfileUpdateDto = userProfileUpdateSchema.parse(raw);
    const row = await this.users.updateProfile(user.sub, dto);
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role as UserRole,
      avatarUrl: row.avatarUrl ?? undefined,
      createdAt: row.createdAt.toISOString(),
      tutorProfileId: row.tutorProfile?.id,
    };
  }

  // image/* gate moved into avatarIntentSchema's refinement; the controller
  // is now a thin pass-through to the storage signer.
  @Post("me/avatar-intent")
  async avatarIntent(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<AvatarUploadIntent> {
    const dto: AvatarIntentDto = avatarIntentSchema.parse(raw);
    const row = await this.users.findBySupabaseId(user.sub);
    if (!row) throw new BadRequestException("Unknown user");
    return this.storage.signAvatarUpload(row.id, dto.contentType);
  }
}
