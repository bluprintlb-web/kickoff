import type { MetadataRoute } from "next";

// Root-level manifest.ts file convention — Next.js auto-injects the
// <link rel="manifest"> tag on every page site-wide (no manual metadata.manifest
// needed, unlike the old admin-only setup which had to use a plain Route
// Handler since this convention only works at the app root). Covers the
// whole site: customers install it and get the normal storefront; an admin
// who logs in reaches /admin from the existing "Admin" link in the account
// menu (src/components/account-menu.tsx) inside the same installed app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kick Off",
    short_name: "Kick Off",
    description: "Football kits, jerseys, trophies, and gear.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#343a40",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
