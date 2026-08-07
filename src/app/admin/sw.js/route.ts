import { NextResponse } from "next/server";

// A Route Handler instead of a public/ static file specifically so this can
// send a Service-Worker-Allowed header — without it, a script served from
// /admin/sw.js can only ever be granted a scope at or below /admin/ (its own
// directory), which by strict spec string-prefix matching does NOT cover
// the bare /admin dashboard route itself (no trailing slash). That gap was
// the actual cause of navigator.serviceWorker.ready hanging forever on the
// dashboard specifically (see src/components/admin/use-push-subscription.ts
// and src/components/admin/pwa-register.tsx, which now registers scope
// "/admin" to match). Deliberately minimal otherwise: this app's data
// (stock, orders) changes constantly, so we don't cache pages or API
// responses — caching stale inventory counts would be actively wrong, not
// just stale. All this does is (1) satisfy the installability requirement
// with a real fetch handler and (2) show a friendly offline page instead of
// the browser's default error when there's no connection at all.
const SOURCE = `const OFFLINE_URL = "/admin/offline";
const CACHE_NAME = "kickoff-admin-shell-v2";

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

// Order push notifications (see src/lib/push-notify.ts, which sends the
// payload this parses) — this is what lets a notification show up even
// when no admin tab is open at all, which a plain in-page notification
// API call could never do.
self.addEventListener("push", (event) => {
  let data = { title: "New order", body: "", url: "/admin" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Malformed/non-JSON payload — fall back to the generic message above
    // rather than showing nothing.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/admin/icons/192",
      badge: "/admin/icons/192",
      data: { url: data.url },
      tag: data.orderId ? \`order-\${data.orderId}\` : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
`;

export function GET() {
  return new NextResponse(SOURCE, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/admin",
    },
  });
}
