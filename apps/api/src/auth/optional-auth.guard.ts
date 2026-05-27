import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Like SupabaseAuthGuard but never blocks the request — if the JWT is
 * absent or invalid, request.user is simply undefined. Use on public
 * endpoints that can personalize when a viewer happens to be signed in
 * (e.g. GET /community/posts wants `hasBookmarked` per current user).
 *
 * Does not enforce the suspension check that SupabaseAuthGuard runs;
 * since the underlying endpoint is public anyway, a suspended user
 * reading a public list is fine.
 */
@Injectable()
export class OptionalSupabaseAuthGuard extends AuthGuard("supabase") {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Swallow: passport throws on missing/invalid token; we want
      // request.user undefined instead of a 401 here.
    }
    return true;
  }

  override handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    // Passport hands `false` for unauthenticated, not null/undefined, so
    // ?? wouldn't trigger. Coerce both falsy states to a real `undefined`
    // so request.user is undefined and the controller's `user?.sub` chain
    // works on the contract that matches the TS annotation.
    return user || undefined;
  }
}
