"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { QUIET_RELOAD_COOKIE } from "@/lib/quiet-reload-cookie";

function consumeQuietReloadCookie() {
  const hasCookie = document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${QUIET_RELOAD_COOKIE}=`));
  if (hasCookie) {
    document.cookie = `${QUIET_RELOAD_COOKIE}=; path=/; max-age=0`;
  }
  return hasCookie;
}

// Sends the user back to "/" whenever they hard-refresh the browser,
// wherever they were. Deliberately checked once per real page load (not on
// every client-side navigation) — this component lives in the root layout,
// which persists across in-app navigations, so a plain mount-only effect
// only ever sees an actual browser reload. Skipped for quiet reloads (e.g.
// the language toggle), which should stay on the same page.
export function ReloadHomeRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const [entry] = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    if (
      entry?.type === "reload" &&
      pathname !== "/" &&
      !consumeQuietReloadCookie()
    ) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
