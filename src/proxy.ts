import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Optimistic check only (reads the JWT session cookie, no DB call).
// Real authorization happens in the DAL (see src/lib/dal.ts) close to the
// data/actions themselves — see Next.js's Data Access Layer guidance.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return;

  if (!req.auth?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (req.auth.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
