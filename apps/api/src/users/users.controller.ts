import { Controller, Get, UseGuards } from "@nestjs/common";
import type { User, UserRole } from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

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
}
