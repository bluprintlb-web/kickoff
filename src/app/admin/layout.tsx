import { ArrowLeft, PackagePlus, ScanBarcode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PwaRegister } from "@/components/admin/pwa-register";
import { AdminSidebarNav } from "@/components/admin/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAdmin } from "@/lib/dal";

// Scopes installability to /admin only — the storefront has no manifest, so
// it never prompts customers to "install" anything. See
// src/app/admin/manifest.webmanifest/route.ts for why this is a plain
// route (not the manifest.ts file convention) and public/admin/sw.js for
// the service worker PwaRegister registers.
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LS Admin",
    statusBarStyle: "black-translucent",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex flex-1 bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-foreground text-xs font-bold text-sidebar">
            LS
          </div>
          <div>
            <p className="text-sm leading-tight font-semibold">Leader Sport</p>
            <p className="text-xs text-sidebar-foreground/50">Admin</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 rounded-lg bg-sidebar-foreground px-3 py-2 text-sm font-medium text-sidebar transition-colors hover:bg-sidebar-foreground/85"
          >
            <PackagePlus className="size-4" />
            Scan to add
          </Link>
          <Link
            href="/admin/pos"
            className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <ScanBarcode className="size-4" />
            Scan to sell
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <p className="px-3 text-xs font-medium tracking-wide text-sidebar-foreground/40 uppercase">
            Menu
          </p>
          <AdminSidebarNav />
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <ThemeToggle
            showLabel
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          />
          <PwaRegister />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to store
          </Link>
        </div>
      </aside>
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">
        {children}
      </div>
    </div>
  );
}
