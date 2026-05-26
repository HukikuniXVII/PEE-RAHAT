import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type {
  NotificationCategory,
  NotificationFeedPage,
  NotificationItem,
  NotificationPreferenceDto,
  NotificationType,
  UpdateNotificationPreferenceDto,
} from "@peerahat/types";
import { NOTIFICATION_CATEGORY_BY_TYPE } from "@peerahat/types";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SseGateway } from "./sse.gateway";
import { WebPushService } from "./web-push.service";

/**
 * FR-CM-08 — call shape for every notify() invocation. category is
 * optional; when missing we derive it from `type` via the static map
 * in @peerahat/types so callers don't have to remember the bucket
 * each time. `sourceType` + `sourceId` are the polymorphic pointer
 * used by the 5-min dedup gate below.
 */
export interface NotifyArgs {
  userId: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  body: string;
  iconKind?: string | null;
  actionUrl?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
}

/** Default page size for the bell-panel feed. */
const FEED_PAGE_SIZE = 20;
/** Hard cap on a single page so a malicious client can't ask for 10k rows. */
const FEED_PAGE_SIZE_MAX = 50;
/** Dedup window: same (userId, type, sourceType, sourceId) within this many
 *  minutes is treated as a duplicate and dropped on the floor. */
const DEDUP_WINDOW_MIN = 5;

/**
 * FR-CM-08 — in-app notification feed + per-user preferences. Single
 * notify() entry point used by every other service: dedups, respects
 * the user's typeOverrides, then writes one Notification row. SSE
 * emission + push delivery layer on top in Phase 2 + Phase 3.
 *
 * notify() is best-effort and never throws: a notification dropped
 * because the user disabled the type, or because of an unexpected
 * Prisma error, must NOT crash the booking / payment / etc. flow that
 * triggered it. Errors are logged and swallowed.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sse: SseGateway,
    private readonly webPush: WebPushService,
  ) {}

  // ── notify() and helpers ───────────────────────────────────────────────

  /**
   * Create one in-app notification. Best-effort. Steps:
   *   1. Resolve category from type when caller didn't pass one.
   *   2. Check the user's typeOverrides — explicit `false` skips.
   *   3. Dedup against the last DEDUP_WINDOW_MIN minutes' unread rows
   *      with the same (userId, type, sourceType, sourceId).
   *   4. INSERT the row.
   *   5. (Phase 2) emit on the user's SSE channel.
   *   6. (Phase 3) enqueue push delivery.
   */
  async notify(args: NotifyArgs): Promise<void> {
    try {
      const category =
        args.category ?? NOTIFICATION_CATEGORY_BY_TYPE[args.type];

      // Step 2 — typeOverrides gate + push-pref read. Missing pref row =
      // all types enabled + push on. Only an explicit `false` in the
      // typeOverrides JSON mutes a type. We fetch the full row up front
      // because the push fan-out at the end of notify() also needs
      // pushEnabled + quietHours* + timezone; one read is cheaper than
      // two and the pref table is one-row-per-user.
      const pref = await this.prisma.notificationPreference.findUnique({
        where: { userId: args.userId },
      });
      if (pref && isTypeMuted(pref.typeOverrides, args.type)) {
        this.logger.debug?.(
          `notify muted by typeOverrides: ${args.type} → ${args.userId}`,
        );
        return;
      }

      // Step 3 — dedup. Same source event firing twice within 5 min
      // (e.g. a retry loop on the payment slip worker) collapses to
      // the first row. Read-then-write race is acceptable here: even
      // if two requests race, the worst case is two rows — far less
      // bad than spamming a user.
      if (args.sourceType && args.sourceId) {
        const cutoff = new Date(Date.now() - DEDUP_WINDOW_MIN * 60_000);
        const recent = await this.prisma.notification.findFirst({
          where: {
            userId: args.userId,
            type: args.type,
            sourceType: args.sourceType,
            sourceId: args.sourceId,
            readAt: null,
            createdAt: { gte: cutoff },
          },
          select: { id: true },
        });
        if (recent) {
          this.logger.debug?.(
            `notify dedup hit: ${args.type} src=${args.sourceType}:${args.sourceId}`,
          );
          return;
        }
      }

      // Step 4 — write the row. Phase-2 SSE gateway will subscribe to
      // a post-write event so we can fan out to the user's open tabs;
      // for now, log a structured event so we can grep prod for
      // "fan-out misses" once the gateway lands.
      const row = await this.prisma.notification.create({
        data: {
          userId: args.userId,
          type: args.type,
          category,
          title: args.title,
          body: args.body,
          iconKind: args.iconKind ?? null,
          actionUrl: args.actionUrl ?? null,
          sourceType: args.sourceType ?? null,
          sourceId: args.sourceId ?? null,
        },
      });
      this.logger.log(
        JSON.stringify({
          event: "notification_created",
          notificationId: row.id,
          userId: args.userId,
          type: args.type,
          category,
          sourceType: args.sourceType ?? null,
          sourceId: args.sourceId ?? null,
        }),
      );
      // FR-CM-08 Phase 2: fan out to any open SSE streams the user has
      // for this instance. emit() is best-effort and swallows write
      // errors — a dead socket gets cleaned up by the next heartbeat
      // or close handler.
      this.sse.emit(args.userId, "notification", {
        id: row.id,
        type: row.type,
        category: row.category,
        title: row.title,
        body: row.body,
        iconKind: row.iconKind,
        actionUrl: row.actionUrl,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        createdAt: row.createdAt.toISOString(),
        readAt: null,
      });

      // FR-CM-08 Phase 3: web push fan-out. Quiet hours block push only
      // (SSE + the in-app row above are unaffected — the user can still
      // see them when they open the bell). pushEnabled defaults to true
      // for users without a pref row.
      const pushEnabled = pref?.pushEnabled ?? true;
      if (pushEnabled && !inQuietHours(pref)) {
        await this.fanoutPush(args.userId, row);
      }
    } catch (e) {
      this.logger.warn(
        `notify(${args.type} → ${args.userId}) failed: ${String(e)}`,
      );
    }
  }

  /**
   * Send the row to every PushSubscription on this user. Best-effort:
   * a "gone" status (404/410 from the push server) prunes the dead
   * row immediately so we don't keep trying; any other failure is
   * logged and skipped (no retry queue in this PR — see Phase 3.1).
   * "ok" bumps lastSeenAt so a future cleanup job can tell live
   * devices from long-stale ones.
   */
  private async fanoutPush(
    userId: string,
    row: {
      id: string;
      type: NotificationType;
      title: string;
      body: string;
      iconKind: string | null;
      actionUrl: string | null;
    },
  ): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });
    if (subs.length === 0) return;
    const payload = {
      id: row.id,
      title: row.title,
      body: row.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Tag collapses identical pushes in the OS shade — keying on the
      // notification id is fine because dedup already collapsed the
      // upstream duplicates.
      tag: row.id,
      data: {
        url: row.actionUrl ?? "/",
        notificationId: row.id,
        type: row.type,
        iconKind: row.iconKind,
      },
    };
    const now = new Date();
    await Promise.all(
      subs.map(async (sub) => {
        const outcome = await this.webPush.sendOne(sub, payload);
        if (outcome === "gone") {
          await this.prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        } else if (outcome === "ok") {
          await this.prisma.pushSubscription
            .update({ where: { id: sub.id }, data: { lastSeenAt: now } })
            .catch(() => {});
        }
      }),
    );
  }

  // ── Feed (paginated) ───────────────────────────────────────────────────

  /**
   * Cursor-paginated feed for the bell panel + /account/notifications.
   * `before` is the createdAt ISO of the last row from the previous
   * page; passing null/undefined returns the newest chunk.
   */
  async list(
    supabaseId: string,
    opts: { limit?: number; before?: string | null } = {},
  ): Promise<NotificationFeedPage> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) return { items: [], nextCursor: null };
    const limit = Math.min(
      FEED_PAGE_SIZE_MAX,
      Math.max(1, opts.limit ?? FEED_PAGE_SIZE),
    );
    const where: Prisma.NotificationWhereInput = { userId: user.id };
    if (opts.before) {
      const cursor = new Date(opts.before);
      if (!Number.isNaN(cursor.getTime())) {
        where.createdAt = { lt: cursor };
      }
    }
    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // take one extra to know if there's a next page
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((r) => this.toItem(r)),
      nextCursor: hasMore
        ? (page[page.length - 1]?.createdAt.toISOString() ?? null)
        : null,
    };
  }

  /**
   * Legacy unpaginated feed. Kept so the existing /notifications GET
   * stays backwards-compatible until Phase 2 swaps the route to the
   * paginated shape.
   */
  async listForUser(supabaseId: string): Promise<NotificationItem[]> {
    const page = await this.list(supabaseId, { limit: FEED_PAGE_SIZE_MAX });
    return page.items;
  }

  /** Count of unread notifications. Powers the bell badge in Phase 2. */
  async unreadCount(supabaseId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) return 0;
    return this.prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });
  }

  // ── Read state ─────────────────────────────────────────────────────────

  /** Mark one notification read — scoped to the owner. */
  async markRead(supabaseId: string, id: string): Promise<void> {
    const user = await this.requireUser(supabaseId);
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Mark every unread notification read. */
  async markAllRead(supabaseId: string): Promise<void> {
    const user = await this.requireUser(supabaseId);
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // ── Preferences ────────────────────────────────────────────────────────

  /**
   * FR-CM-08 — read preferences. Returns defaults when the user has no
   * NotificationPreference row yet (most users on launch). Defaults
   * mirror the Prisma column defaults so the wire shape never has to
   * guess at server-side state.
   */
  async getPreferences(supabaseId: string): Promise<NotificationPreferenceDto> {
    const user = await this.requireUser(supabaseId);
    const row = await this.prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });
    if (!row) {
      return {
        pushEnabled: true,
        typeOverrides: {},
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: "Asia/Bangkok",
      };
    }
    return {
      pushEnabled: row.pushEnabled,
      typeOverrides: coerceTypeOverrides(row.typeOverrides),
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      timezone: row.timezone,
    };
  }

  /**
   * Upsert the user's preference row from a partial DTO. Missing fields
   * keep their previous value (or the schema default on first write).
   * typeOverrides merges shallow: passing {chat_new_message: false}
   * sets just that key, leaving other entries intact.
   */
  async updatePreferences(
    supabaseId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceDto> {
    const user = await this.requireUser(supabaseId);
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });
    const existingOverrides = existing
      ? coerceTypeOverrides(existing.typeOverrides)
      : {};
    const mergedOverrides = dto.typeOverrides
      ? { ...existingOverrides, ...dto.typeOverrides }
      : existingOverrides;
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {
        ...(dto.pushEnabled !== undefined
          ? { pushEnabled: dto.pushEnabled }
          : {}),
        ...(dto.typeOverrides !== undefined
          ? { typeOverrides: mergedOverrides as Prisma.InputJsonValue }
          : {}),
        ...(dto.quietHoursStart !== undefined
          ? { quietHoursStart: dto.quietHoursStart }
          : {}),
        ...(dto.quietHoursEnd !== undefined
          ? { quietHoursEnd: dto.quietHoursEnd }
          : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      },
      create: {
        userId: user.id,
        pushEnabled: dto.pushEnabled ?? true,
        typeOverrides: mergedOverrides as Prisma.InputJsonValue,
        quietHoursStart: dto.quietHoursStart ?? null,
        quietHoursEnd: dto.quietHoursEnd ?? null,
        timezone: dto.timezone ?? "Asia/Bangkok",
      },
    });
    return {
      pushEnabled: row.pushEnabled,
      typeOverrides: coerceTypeOverrides(row.typeOverrides),
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      timezone: row.timezone,
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private async requireUser(supabaseId: string): Promise<{ id: string }> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException("Unknown user");
    return user;
  }

  private toItem(
    r: {
      id: string;
      type: NotificationType;
      category: NotificationCategory;
      title: string;
      body: string;
      iconKind: string | null;
      actionUrl: string | null;
      sourceType: string | null;
      sourceId: string | null;
      readAt: Date | null;
      createdAt: Date;
    },
  ): NotificationItem {
    return {
      id: r.id,
      type: r.type,
      category: r.category,
      title: r.title,
      body: r.body,
      iconKind: r.iconKind,
      actionUrl: r.actionUrl,
      // FR-CM-08 deprecated alias: same value, kept on the wire until
      // every client build has shipped with the actionUrl read.
      linkUrl: r.actionUrl,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }
}

/** Read-only helper: is the user's stored typeOverrides JSON saying
 *  this type is muted? Defaults to false (not muted) for any input
 *  that isn't a flat string→boolean map. */
function isTypeMuted(
  overrides: Prisma.JsonValue,
  type: NotificationType,
): boolean {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return false;
  }
  const value = (overrides as Record<string, unknown>)[type];
  return value === false;
}

function coerceTypeOverrides(
  v: Prisma.JsonValue,
): Partial<Record<NotificationType, boolean>> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Partial<Record<NotificationType, boolean>> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "boolean") {
      out[k as NotificationType] = val;
    }
  }
  return out;
}

/**
 * FR-CM-08 Phase 3 — quiet-hours check. Both start + end are integers
 * 0..23 in the user's stored timezone (default Asia/Bangkok). Range
 * wraps over midnight when start > end (e.g. 22→7 means 22:00..06:59
 * are quiet). Returns false when either bound is null or when the
 * caller passed no pref row.
 *
 * Computes the user's current hour via Intl.DateTimeFormat so DST
 * shifts (none in BKK, but possible if a user picks another tz) are
 * handled correctly without pulling in a date library.
 */
function inQuietHours(
  pref:
    | {
        quietHoursStart: number | null;
        quietHoursEnd: number | null;
        timezone: string;
      }
    | null
    | undefined,
): boolean {
  if (!pref) return false;
  const { quietHoursStart: start, quietHoursEnd: end, timezone } = pref;
  if (start == null || end == null) return false;
  if (start === end) return false;
  let hour: number;
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone || "Asia/Bangkok",
    }).format(new Date());
    hour = Number.parseInt(formatted, 10);
    if (Number.isNaN(hour)) return false;
  } catch {
    return false;
  }
  if (start < end) {
    return hour >= start && hour < end;
  }
  // Wraps midnight (e.g. 22 → 7): quiet from start..23 and 0..end-1.
  return hour >= start || hour < end;
}
