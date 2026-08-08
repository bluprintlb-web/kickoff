"use client";

import { LayoutDashboard, Package, ScanBarcode, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/pos", label: "Sell (POS)", icon: ScanBarcode, exact: false },
  { href: "/admin/profile", label: "Profile", icon: User, exact: false },
] as const;

export function AdminTopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-2.5 py-4 text-sm font-medium whitespace-nowrap transition-all duration-200 sm:px-3",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:-translate-y-0.5 hover:border-border hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
