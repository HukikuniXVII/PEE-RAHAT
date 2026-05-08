import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { SupabaseJwtPayload } from "./supabase-jwt.strategy";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupabaseJwtPayload => {
    const req = ctx.switchToHttp().getRequest<{ user: SupabaseJwtPayload }>();
    return req.user;
  },
);
