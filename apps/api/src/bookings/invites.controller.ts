import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  type DeclineInviteDto,
  declineInviteSchema,
  type InviteSummaryDto,
} from "@peerahat/types";

import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { GroupSessionService } from "./group-session.service";

/**
 * FR-TH-18: public landing + authed accept/decline for invite codes.
 * Mounted at /invites so the URL pattern stays separate from the
 * authed /bookings tree — this lets the public GET stay on a no-guard
 * route while accept/decline remain SupabaseAuthGuarded.
 */
@Controller("invites")
export class InvitesController {
  constructor(private readonly groupSessions: GroupSessionService) {}

  // Public: anyone with the link can fetch the summary card. PDPA-safe
  // payload (no participant emails, no participant list — see service).
  @Get(":code")
  summary(@Param("code") code: string): Promise<InviteSummaryDto> {
    return this.groupSessions.getInviteSummary(code);
  }

  @Post(":code/accept")
  @UseGuards(SupabaseAuthGuard)
  accept(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("code") code: string,
  ) {
    return this.groupSessions.acceptInvite(user.sub, code);
  }

  @Post(":code/decline")
  @UseGuards(SupabaseAuthGuard)
  decline(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("code") code: string,
    @Body() raw: unknown,
  ) {
    // Body is optional (a decline with no reason is a silent decline) —
    // safeParse falls back to an empty object so the schema's optional
    // reason field works as expected.
    const dto: DeclineInviteDto = declineInviteSchema.parse(raw ?? {});
    return this.groupSessions.declineInvite(user.sub, code, dto.reason);
  }
}
