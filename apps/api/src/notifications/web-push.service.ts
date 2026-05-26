import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush, { WebPushError } from "web-push";

/**
 * FR-CM-08 Phase 3 — wraps the `web-push` library so the rest of the
 * codebase doesn't have to know about VAPID config.
 *
 * VAPID keys are loaded from env at boot:
 *   WEB_PUSH_VAPID_PUBLIC_KEY
 *   WEB_PUSH_VAPID_PRIVATE_KEY
 *   WEB_PUSH_SUBJECT   (mailto: or https:// — required by push servers)
 *
 * When any of the three is missing the service stays inert: sendOne()
 * returns "skipped" so dev environments and unconfigured deploys don't
 * crash. The subscribe / unsubscribe endpoints stay live regardless so
 * a client can register early; rows just sit unused until VAPID is set.
 */
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly publicKey: string | null;
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    const publicKey = config.get<string>("WEB_PUSH_VAPID_PUBLIC_KEY");
    const privateKey = config.get<string>("WEB_PUSH_VAPID_PRIVATE_KEY");
    const subject = config.get<string>("WEB_PUSH_SUBJECT");
    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.publicKey = publicKey;
      this.configured = true;
    } else {
      this.publicKey = null;
      this.configured = false;
      this.logger.warn(
        "WEB_PUSH_VAPID_* not set — push delivery disabled (subscribe API still live).",
      );
    }
  }

  /** Public key for the browser to pass to pushManager.subscribe(). */
  getPublicKey(): string | null {
    return this.publicKey;
  }

  /** True once VAPID env is present. */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Send one encrypted payload to a single subscription.
   *
   * Outcome semantics for the caller (NotificationService):
   *   - "ok"       — push server accepted (2xx).
   *   - "gone"     — 404/410: subscription is dead, caller should DELETE.
   *   - "skipped"  — VAPID not configured; treat as a no-op.
   *   - "failed"   — other error (network, 429, malformed); leave the
   *                  row in place, log, move on. A retry queue is out
   *                  of scope for the first push PR.
   */
  async sendOne(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: Record<string, unknown>,
  ): Promise<"ok" | "gone" | "skipped" | "failed"> {
    if (!this.configured) return "skipped";
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 },
      );
      return "ok";
    } catch (err) {
      if (err instanceof WebPushError) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          return "gone";
        }
        this.logger.warn(
          `web-push send failed status=${err.statusCode} body=${err.body}`,
        );
        return "failed";
      }
      this.logger.warn(`web-push send threw: ${String(err)}`);
      return "failed";
    }
  }
}
