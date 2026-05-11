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

const CACHE_VERSION = "v1";
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
