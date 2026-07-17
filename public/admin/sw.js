// Scoped to /admin/ only (see registration in src/components/admin/pwa-register.tsx).
// Deliberately minimal: this app's data (stock, orders) changes constantly,
// so we don't cache pages or API responses — caching stale inventory counts
// would be actively wrong, not just stale. All this does is (1) satisfy the
// installability requirement with a real fetch handler and (2) show a
// friendly offline page instead of the browser's default error when there's
// no connection at all.
const OFFLINE_URL = "/admin/offline";
const CACHE_NAME = "leader-sport-admin-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
