import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import { PrismaService } from "../prisma/prisma.service";
import type { SupabaseJwtPayload } from "./supabase-jwt.strategy";

/**
 * Authenticates the Supabase JWT and, on top of that, blocks any user
 * whose account is currently suspended (report system, FR-CM-05).
 *
 * Auth is stateless (no session table), so this guard is the enforcement
 * point for the suspension_temp / suspension_perm / account_banned
 * resolutions — a suspended user is rejected on their very next request.
 */
@Injectable()
export class SupabaseAuthGuard extends AuthGuard("supabase") {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: SupabaseJwtPayload }>();
    const supabaseId = request.user?.sub;
    if (supabaseId) {
      const user = await this.prisma.user.findUnique({
        where: { supabaseId },
        select: { suspendedUntil: true },
      });
      if (user?.suspendedUntil && user.suspendedUntil.getTime() > Date.now()) {
        throw new ForbiddenException("บัญชีของคุณถูกพักการใช้งานชั่วคราว");
      }
    }
    return true;
  }
}
