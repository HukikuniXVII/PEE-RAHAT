import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";
import type {
  AvatarUploadIntent,
  User,
  UserRole,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { StorageService } from "../common/storage.service";
import { UsersService } from "./users.service";

class UserProfileUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) displayName?: string;
  @IsOptional() @IsUrl() avatarUrl?: string;
}

class AvatarIntentDto {
  @IsString() contentType!: string;
}

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
    @Body() dto: UserProfileUpdateDto,
  ): Promise<User> {
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

  @Post("me/avatar-intent")
  async avatarIntent(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: AvatarIntentDto,
  ): Promise<AvatarUploadIntent> {
    if (!dto.contentType.startsWith("image/")) {
      throw new BadRequestException("avatar contentType must be image/*");
    }
    const row = await this.users.findBySupabaseId(user.sub);
    if (!row) throw new BadRequestException("Unknown user");
    return this.storage.signAvatarUpload(row.id, dto.contentType);
  }
}
