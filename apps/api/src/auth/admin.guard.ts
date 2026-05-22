import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { SupabaseJwtPayload } from "./supabase-jwt.strategy";

/**
 * Admin-only route guard. Runs after SupabaseAuthGuard (which authenticates
 * and populates `request.user`) and rejects any non-admin caller — use as
 * `@UseGuards(SupabaseAuthGuard, AdminGuard)`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: SupabaseJwtPayload }>();
    const supabaseId = request.user?.sub;
    if (!supabaseId) throw new ForbiddenException();
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { role: true },
    });
    if (user?.role !== "admin") {
      throw new ForbiddenException("ต้องเป็นแอดมินเท่านั้น");
    }
    return true;
  }
}
