import { ArrowLeft, PackagePlus, ScanBarcode } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PushNotificationsButton } from "@/components/admin/push-notifications-button";
import { PwaRegister } from "@/components/admin/pwa-register";
import { AdminTopNav } from "@/components/admin/top-nav";
import { Button } from "@/components/ui/button";
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
    title: "Kick Off Admin",
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
    // Admin is permanently dark (forces the .dark class regardless of the
    // storefront's light/dark toggle) — it reads the same shared tokens as
    // the storefront's dark mode (see globals.css) rather than a separate
    // palette, so no per-component changes are needed here.
    <div className="dark flex min-h-full flex-1 flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black p-1">
              <Image
                src="/brand/kickoff-icon.png"
                alt=""
                width={28}
                height={28}
                className="size-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm leading-tight font-semibold">Kick Off</p>
              <p className="text-xs text-muted-foreground">
                Admin · Inventory · Sales · Stock
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PushNotificationsButton />
            <PwaRegister />
            <Link href="/admin/products/new">
              <Button type="button" size="sm">
                <PackagePlus className="size-4" />
                Scan to add
              </Button>
            </Link>
            <Link href="/admin/pos">
              <Button type="button" size="sm">
                <ScanBarcode className="size-4" />
                Scan to sell
              </Button>
            </Link>
            <Link
              href="/"
              title="Back to store"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl overflow-x-auto px-6">
          <AdminTopNav />
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
