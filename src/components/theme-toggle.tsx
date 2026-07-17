"use client";

import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Keep in sync with the inline width below — used to compute the sliding
// highlight's pixel offset. Wider than the EN/AR toggle's 36px since
// "Light"/"Dark" (and their Arabic equivalents) need more room than 2 letters.
const OPTION_WIDTH = 72;

export function ThemeToggle({
  className,
  showLabel = false,
  labels = { light: "Light mode", dark: "Dark mode" },
}: {
  className?: string;
  showLabel?: boolean;
  labels?: { light: string; dark: string };
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const sectionDefaultDark = pathname.startsWith("/admin");
  const isDark = theme === null ? sectionDefaultDark : theme === "dark";

  // Admin sidebar: a single full-width row (icon + current-mode label),
  // toggling between the two modes on click.
  if (showLabel) {
    const icon = (
      <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
        <Sun
          className={cn(
            "absolute size-4 transition-all duration-300 ease-out",
            isDark ? "scale-50 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute size-4 transition-all duration-300 ease-out",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-90 opacity-0"
          )}
        />
      </span>
    );
    return (
      <Button
        type="button"
        variant="ghost"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn("justify-start gap-2", className)}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current/20">
          {icon}
        </span>
        {isDark ? labels.dark : labels.light}
      </Button>
    );
  }

  // Storefront header: both options always visible, like the EN/AR language
  // toggle right next to it — no icon/state to interpret, just pick one.
  const active = isDark ? "dark" : "light";

  return (
    <div
      className={cn(
        "relative flex items-center rounded-full border p-0.5",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-full bg-white/15 transition-transform duration-300 ease-out"
        style={{ width: OPTION_WIDTH, transform: `translateX(${active === "dark" ? OPTION_WIDTH : 0}px)` }}
      />
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={active === "light"}
        style={{ width: OPTION_WIDTH }}
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 rounded-full py-1 text-xs font-semibold transition-opacity duration-200",
          active === "light" ? "opacity-100" : "opacity-60 hover:opacity-90"
        )}
      >
        <Sun className="size-3.5" />
        {labels.light}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={active === "dark"}
        style={{ width: OPTION_WIDTH }}
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 rounded-full py-1 text-xs font-semibold transition-opacity duration-200",
          active === "dark" ? "opacity-100" : "opacity-60 hover:opacity-90"
        )}
      >
        <Moon className="size-3.5" />
        {labels.dark}
      </button>
    </div>
  );
}
