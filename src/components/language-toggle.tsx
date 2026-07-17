"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";
import { QUIET_RELOAD_COOKIE } from "@/lib/quiet-reload-cookie";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ar", label: "AR" },
];

// Keep in sync with the w-* below (w-9 = 36px) — used to compute the
// sliding highlight's pixel offset.
const OPTION_WIDTH = 36;

function setLocaleCookie(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
}

function setQuietReloadCookie() {
  document.cookie = `${QUIET_RELOAD_COOKIE}=1; path=/; max-age=5; SameSite=Lax`;
}

export function LanguageToggle({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const [pending, setPending] = useState<Locale | null>(null);
  const active = pending ?? locale;
  const activeIndex = OPTIONS.findIndex((o) => o.value === active);

  function handleSelect(next: Locale) {
    if (pending || next === locale) return;
    setPending(next);
    setLocaleCookie(next);
    setQuietReloadCookie();
    // Give the slide animation a moment to actually play before the reload
    // (needed for the new locale to take effect server-side) cuts it off.
    window.setTimeout(() => window.location.reload(), 260);
  }

  return (
    <div
      className={cn(
        "relative flex items-center rounded-full border p-0.5",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 w-9 rounded-full bg-orange-500 transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${activeIndex * OPTION_WIDTH}px)` }}
      />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSelect(option.value)}
          aria-pressed={active === option.value}
          className={cn(
            "relative z-10 w-9 rounded-full py-1 text-center text-xs font-semibold transition-opacity duration-200",
            active === option.value
              ? "text-white opacity-100"
              : "opacity-70 hover:opacity-100"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
