/**
 * FR-CM-08 Phase 3 — browser-side push subscribe helpers. Thin wrapper
 * around the PushManager API; the heavy lifting (storing rows,
 * encryption, fan-out) lives in apps/api.
 *
 * Call shape:
 *   - isPushSupported()                — feature-detect both SW + Push API.
 *   - getCurrentSubscription()         — read the current PushSubscription
 *                                        on this device (null if none).
 *   - subscribePush(api)               — request permission, register,
 *                                        POST to /push/subscribe.
 *   - unsubscribePush(api, endpoint)   — unsubscribe + DELETE row.
 */

import type { ApiClient } from "./api-client";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Current permission state — Notification.permission, defaulting to
 *  "default" on platforms that don't expose it. */
export function getPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "default";
  return Notification.permission;
}

/** The PushSubscription currently registered to the active SW, or null
 *  when the user hasn't granted permission yet. Awaits the SW's `ready`
 *  promise so it works on first paint after a hard reload. */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Subscribe the current browser to push.
 *
 * Steps:
 *   1. Fetch the VAPID public key from /push/vapid-public-key. Bail
 *      when the server returns null (push not configured) — the caller
 *      surfaces a friendly message.
 *   2. Request notification permission. The browser only allows this
 *      from a user gesture, so the caller MUST invoke this from a
 *      click / tap handler.
 *   3. Register the SW (if not already) and call pushManager.subscribe
 *      with the applicationServerKey converted from base64-URL bytes.
 *   4. POST the resulting endpoint + keys to the API.
 */
export async function subscribePush(
  api: ApiClient,
): Promise<
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: "unsupported" | "denied" | "not-configured" | "error"; error?: unknown }
> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const { publicKey } = await api.push.vapidPublicKey();
    if (!publicKey) return { ok: false, reason: "not-configured" };
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
    }
    const json = subscription.toJSON();
    await api.push.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      },
      userAgent: navigator.userAgent,
    });
    return { ok: true, subscription };
  } catch (e) {
    return { ok: false, reason: "error", error: e };
  }
}

/**
 * Unsubscribe the current browser. If `endpoint` is passed we DELETE
 * the row for that endpoint regardless of the current SW (used by the
 * settings page "revoke" button); otherwise we call browser.unsubscribe
 * on the current registration and delete that row.
 */
export async function unsubscribePush(
  api: ApiClient,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sub = await getCurrentSubscription();
  if (!sub) return { ok: true };
  try {
    await sub.unsubscribe();
  } catch {
    /* still try to clean up on the server */
  }
  try {
    await api.push.unsubscribe(sub.endpoint);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true };
}

/** VAPID public key arrives as URL-safe base64; the PushManager
 *  applicationServerKey field needs raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
