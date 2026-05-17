import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Rate-limit guard that keys on the Supabase user.sub when the route runs
 * downstream of SupabaseAuthGuard, falling back to req.ip otherwise. Apply
 * AFTER an auth guard at the route level so req.user is populated:
 *
 *   @Post()
 *   @UseGuards(UserThrottlerGuard)
 *   @Throttle({ default: { limit: 10, ttl: 60_000 } })
 *
 * Class-level guards (e.g. @UseGuards(SupabaseAuthGuard) on the controller)
 * run before method-level guards, so user.sub is already set when this
 * runs and the throttle bucket is per-user, not per-IP.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { sub?: unknown } | undefined;
    if (user && typeof user.sub === "string" && user.sub.length > 0) {
      return Promise.resolve(`user:${user.sub}`);
    }
    const ip = typeof req.ip === "string" ? req.ip : "unknown";
    return Promise.resolve(`ip:${ip}`);
  }
}
