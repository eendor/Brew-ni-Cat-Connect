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

// A statically generated Next.js page is sent as a loading shell plus a
// hidden copy of the page that a script moves into place. Offline that
// script's runtime cannot load, so the hidden copy never appears. Move it
// into the page ourselves: this runs inline, so the cached page is readable
// with no network and no JavaScript chunks.
const OFFLINE_REVEAL = `<script>(function () {
  var content =
    document.getElementById("S:0") || document.querySelector('div[id^="S:"]');
  var main = document.getElementById("main-content") || document.querySelector("main");
  if (!content || !main) return;
  main.innerHTML = content.innerHTML;
  content.remove();
})();</script>`;

async function offlinePage() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(OFFLINE_URL);
  if (!cached) return Response.error();

  const html = await cached.text();
  const headers = new Headers(cached.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  // Only inline scripts may run: they reveal the cached page. External
  // chunks are blocked so nothing can re-render the requested route or fetch
  // menu data, prices or API responses.
  headers.set("Content-Security-Policy", "script-src 'unsafe-inline'");
  return new Response(
    html.includes("</body>")
      ? html.replace("</body>", `${OFFLINE_REVEAL}</body>`)
      : html + OFFLINE_REVEAL,
    {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    },
  );
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
  // to the cached offline page, never to a cached copy of another page. The
  // no-store option also keeps the browser's HTTP cache out of the way, so a
  // cached page can never stand in for a live one.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request, { cache: "no-store" });
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
