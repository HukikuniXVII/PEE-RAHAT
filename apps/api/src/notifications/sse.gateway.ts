import { Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";

/**
 * FR-CM-08 — process-local SSE fan-out for in-app notifications.
 *
 * Keeps an in-memory Map<userId, Set<Response>> of open
 * /notifications/stream sockets. `emit(userId, event)` writes the
 * payload to every open connection that user has (one per tab,
 * typically). `register()` is called from the controller when a
 * client connects; `unregister()` runs on socket close.
 *
 * **Single instance only.** When we scale the API horizontally a
 * notification fired on instance A won't reach a stream on instance B.
 * The README task in Phase 3 is to swap this for a Redis pub/sub layer
 * — same emit/register surface, fanned through Redis. For now we run
 * one container so a Map is enough.
 *
 * Heartbeats keep proxies (Cloudflare in our case) from buffering /
 * timing out the connection. SSE format: a line beginning with `:` is
 * a comment, ignored by the EventSource client.
 */
@Injectable()
export class SseGateway {
  private readonly logger = new Logger(SseGateway.name);
  private readonly connections = new Map<string, Set<Response>>();
  private readonly heartbeatHandles = new Map<Response, NodeJS.Timeout>();
  /** Send a `: keep-alive` comment every 30s so Cloudflare / Nginx don't
   *  drop the long-lived socket as idle. */
  private static readonly HEARTBEAT_MS = 30_000;

  /**
   * Register a new client connection for `userId`. The caller (the SSE
   * controller) is responsible for setting the SSE headers on `res` and
   * for calling `unregister()` on socket close.
   */
  register(userId: string, res: Response): void {
    let set = this.connections.get(userId);
    if (!set) {
      set = new Set();
      this.connections.set(userId, set);
    }
    set.add(res);

    // Initial comment so the browser knows the connection is live.
    res.write(`: connected\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        // Socket is dead — controller's close handler will run shortly.
      }
    }, SseGateway.HEARTBEAT_MS);
    this.heartbeatHandles.set(res, heartbeat);

    this.logger.debug?.(
      `sse register userId=${userId} connections=${set.size}`,
    );
  }

  unregister(userId: string, res: Response): void {
    const heartbeat = this.heartbeatHandles.get(res);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatHandles.delete(res);
    }
    const set = this.connections.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) {
      this.connections.delete(userId);
    }
  }

  /**
   * Fan a JSON-serialisable event out to every open stream for `userId`.
   * `event` becomes the SSE `event:` field; clients listen via
   * `es.addEventListener("notification", …)`. Errors writing to a dead
   * socket are swallowed — the next iteration of `res.write` or the
   * close handler cleans it up.
   */
  emit(userId: string, event: string, data: unknown): void {
    const set = this.connections.get(userId);
    if (!set || set.size === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try {
        res.write(payload);
      } catch (err) {
        this.logger.warn(
          `sse write failed userId=${userId}: ${String(err)}`,
        );
      }
    }
  }

  /**
   * Fire a `cache.invalidate` event at each `userId` so their open
   * EventSource clients call `queryClient.invalidateQueries({ queryKey })`.
   * Generic alternative to one event-type-per-domain — backend services
   * pass the React Query key they want refetched and the audience.
   *
   * Audience computation is the caller's job (e.g., booking mutations
   * pass [studentUserId, tutorUserId], group mutations pass everyone in
   * the roster). Empty arrays are a no-op so callers don't need to
   * conditionally skip the call when nobody's online.
   *
   * Duplicates inside `userIds` are silently coalesced — handy when the
   * same user is on both sides of a booking-with-self test scenario.
   */
  publishInvalidate(userIds: readonly string[], queryKey: readonly unknown[]): void {
    if (userIds.length === 0) return;
    const seen = new Set<string>();
    for (const userId of userIds) {
      if (seen.has(userId)) continue;
      seen.add(userId);
      this.emit(userId, "cache.invalidate", { queryKey });
    }
  }

  /** Total open connections — used by the /health check and tests. */
  totalConnections(): number {
    let n = 0;
    for (const set of this.connections.values()) n += set.size;
    return n;
  }
}
