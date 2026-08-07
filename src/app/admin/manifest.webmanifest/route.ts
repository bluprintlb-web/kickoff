import { NextResponse } from "next/server";

// Scoped to /admin only — the customer storefront has no manifest, so it
// never shows an "install app" prompt. See src/app/admin/layout.tsx, which
// points its metadata.manifest at this route (the manifest.* file
// convention only works at the app root, so this has to be a plain route).
export function GET() {
  return NextResponse.json({
    id: "/admin",
    name: "Kick Off Admin",
    short_name: "Kick Off Admin",
    description: "Manage products, stock, and in-store sales for Kick Off.",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#212529",
    theme_color: "#212529",
    icons: [
      { src: "/admin/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/admin/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/admin/icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  });
}
