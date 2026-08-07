"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

// Tri-state: null means "no explicit user choice yet — use this section's
// own default" (storefront defaults light, admin defaults dark, matching
// how each was actually designed). Once a user toggles anywhere, that
// becomes an explicit site-wide preference from then on. See the
// beforeInteractive script in src/app/layout.tsx for the no-flash version
// of this same logic applied before hydration.
type Theme = "light" | "dark" | null;
type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "kickoff-theme";

function parseTheme(raw: string | null): Theme {
  return raw === "light" || raw === "dark" ? raw : null;
}

// useSyncExternalStore (not useState+useEffect) is what actually avoids the
// hydration mismatch here — its getServerSnapshot always wins on the first
// client render (matching what the server rendered, since the server has no
// localStorage), then it re-syncs to the real stored value right after
// mount without React ever comparing mismatched server/client output for
// this component. A plain useState(readStoredTheme) initializer looks
// similar but actually reads localStorage *during* the hydration render
// itself, which is exactly the mismatch this replaced.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): Theme {
  return parseTheme(window.localStorage.getItem(STORAGE_KEY));
}

function getServerSnapshot(): Theme {
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const sectionDefaultDark = pathname.startsWith("/admin");
    const isDark = theme === null ? sectionDefaultDark : theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme, pathname]);

  function setTheme(next: Theme) {
    if (next === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    // The native "storage" event only fires in *other* tabs, not this one —
    // dispatch a synthetic one so this tab's useSyncExternalStore re-reads
    // and picks up the change immediately too.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
