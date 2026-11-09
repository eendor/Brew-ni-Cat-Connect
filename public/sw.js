/**
 * Brew ni Cat Connect service worker (FR-068).
 *
 * It keeps a small app shell so a customer without a connection sees the
 * offline page instead of the browser's error. Page HTML, API responses,
 * Supabase responses, menu data and prices are never cached: a cached page
 * could show an old price or an order state that is no longer true.
 */

const CACHE_NAME = "bnc-shell-v1";
const OFFLINE_URL = "/offline";
const SHELL_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/"))
  );
}

function isNextDataRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

async function offlinePage() {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(OFFLINE_URL)) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Leave non-GET requests, other origins (Supabase), API responses and
  // Next.js data requests alone, so nothing that can change is cached.
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (isNextDataRequest(request, url)) return;

  // Pages always come from the network. Only a failed navigation falls back
  // to the cached offline page, never to a cached copy of another page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return offlinePage();
        }
      })(),
    );
    return;
  }

  // Build assets and icons have content-based file names, so a cached copy
  // can never be stale.
  if (isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
