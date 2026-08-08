import { NextResponse } from "next/server";
import { auth } from "@/auth";

// PWA plumbing under /admin that has to stay publicly fetchable — no admin
// data in any of it, just the manifest/icons/service worker a browser or OS
// needs to fetch before (or without) a session cookie in play. Everything
// else under /admin is real admin UI/data and stays gated below.
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/manifest.webmanifest",
  "/admin/sw.js",
  "/admin/icon",
  "/admin/apple-icon",
]);

// Optimistic check only (reads the JWT session cookie, no DB call).
// Real authorization happens in the DAL (see src/lib/dal.ts) close to the
// data/actions themselves — see Next.js's Data Access Layer guidance.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return;
  if (PUBLIC_ADMIN_PATHS.has(pathname) || pathname.startsWith("/admin/icons/")) {
    return;
  }

  if (!req.auth?.user) {
    // The ?admin=1 marker lets /login (shared with customer login) know
    // this visit came from a gated /admin route, so it can expose the
    // admin manifest/service worker for PWA installability crawlers (e.g.
    // PWABuilder) that hit /admin without a session and land here instead
    // — see src/app/(storefront)/login/page.tsx. Only set on this redirect
    // path, never on a plain customer visit to /login.
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("admin", "1");
    return NextResponse.redirect(loginUrl);
  }
  if (req.auth.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
