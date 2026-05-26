// NFR-10: PWA service worker.
//
// Strategy:
//   - Navigations  → network-first, fall back to the precached /offline page
//                    when the network is unreachable.
//   - Static asset → cache-first (Next.js fingerprints filenames under
//                    /_next/static, so stale entries can't lie about content).
//   - API calls    → always bypass the cache; auth-protected data must be
//                    fresh and the SW must not see Authorization headers.
//
// Bump CACHE_VERSION whenever the offline shell or this script changes; old
// caches are deleted during `activate`.

const CACHE_VERSION = "v2";
const OFFLINE_CACHE = `peerahat-offline-${CACHE_VERSION}`;
const STATIC_CACHE = `peerahat-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== OFFLINE_CACHE && k !== STATIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — they're authenticated and short-lived.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  }
});

async function handleNavigation(request) {
  try {
    const fresh = await fetch(request);
    return fresh;
  } catch {
    const cache = await caches.open(OFFLINE_CACHE);
    const cached = await cache.match(OFFLINE_URL);
    return (
      cached ??
      new Response("Offline", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

// ── FR-CM-08 Phase 3 — web push handlers ───────────────────────────────────
//
// Server sends JSON: { id, title, body, icon, badge, tag, data: { url, ... } }
// Wrapped in a try/catch because the spec doesn't promise a payload
// (some push servers may deliver an empty body) — fall back to a generic
// "การแจ้งเตือนใหม่" notification so the user still sees something.
//
// notificationclick brings an existing tab to the foreground when it
// matches data.url (so opening "/bookings/abc" doesn't spawn a second
// tab if /bookings is already open) and falls back to clients.openWindow.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "การแจ้งเตือนใหม่";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    tag: payload.tag || undefined,
    data: payload.data || {},
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  const absolute = new URL(target, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((all) => {
        for (const client of all) {
          // Same-origin tab already on the deep link → focus it instead
          // of opening a new one.
          if (client.url === absolute && "focus" in client) {
            return client.focus();
          }
        }
        for (const client of all) {
          // Any other same-origin tab → navigate it to the deep link
          // (less disruptive than spawning yet another window).
          if (client.url.startsWith(self.location.origin) && "navigate" in client) {
            return client.navigate(absolute).then((c) => c && c.focus());
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(absolute);
        }
        return undefined;
      }),
  );
});
