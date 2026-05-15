import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { SupabaseAuthGuard } from "../../auth/auth.guard";
import type { SupabaseJwtPayload } from "../../auth/supabase-jwt.strategy";
import { CurrentUser } from "../../auth/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { GoogleOAuthService } from "./google-oauth.service";

@Controller("auth/google")
export class GoogleCalendarController {
  constructor(
    private readonly oauth: GoogleOAuthService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * FR-TH-17: kicks off the tutor's OAuth flow. Redirects the browser to
   * Google's consent screen with a signed state token carrying tutorId.
   * Auth-required: only tutors can connect their own Google account.
   */
  @Get("connect")
  @UseGuards(SupabaseAuthGuard)
  async connect(
    @CurrentUser() user: SupabaseJwtPayload,
    @Res() res: Response,
  ) {
    const tutor = await this.requireTutor(user.sub);
    const url = this.oauth.getAuthorizationUrl(tutor.id);
    res.redirect(url);
  }

  /**
   * FR-TH-17: Google posts here with ?code + ?state. We unauthenticate
   * this endpoint (the user's session may be on the frontend domain
   * only) — the state JWT is the integrity guard. After persisting we
   * redirect to the frontend onboarding success page.
   */
  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    if (error) {
      return res.redirect(
        `${webOrigin}/tutors/me/edit?google=denied&reason=${encodeURIComponent(error)}`,
      );
    }
    if (!code || !state) {
      throw new BadRequestException("OAuth callback missing code or state");
    }
    try {
      const { email } = await this.oauth.handleCallback(code, state);
      return res.redirect(
        `${webOrigin}/tutors/me/edit?google=connected&email=${encodeURIComponent(email)}`,
      );
    } catch (err) {
      return res.redirect(
        `${webOrigin}/tutors/me/edit?google=failed&reason=${encodeURIComponent((err as Error).message)}`,
      );
    }
  }

  @Post("disconnect")
  @UseGuards(SupabaseAuthGuard)
  async disconnect(@CurrentUser() user: SupabaseJwtPayload) {
    const tutor = await this.requireTutor(user.sub);
    await this.oauth.disconnect(tutor.id);
    return { connected: false };
  }

  @Get("status")
  @UseGuards(SupabaseAuthGuard)
  async status(@CurrentUser() user: SupabaseJwtPayload) {
    const tutor = await this.requireTutor(user.sub);
    return this.oauth.status(tutor.id);
  }

  private async requireTutor(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: { tutorProfile: true },
    });
    if (!user) throw new BadRequestException("Unknown user");
    if (!user.tutorProfile) {
      throw new BadRequestException(
        "Only tutors can connect a Google account — finish tutor onboarding first",
      );
    }
    return user.tutorProfile;
  }
}
