import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReloadHomeRedirect } from "@/components/reload-home-redirect";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { TRPCProvider } from "@/trpc/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leader Sport",
  description: "Football kits, jerseys, trophies, and gear.",
};

// Keeps the storefront light-by-default and admin dark-by-default until a
// user explicitly toggles (see src/components/theme-provider.tsx for the
// same logic applied after hydration) — runs before paint so there's no
// flash of the wrong theme on load.
const THEME_INIT_SCRIPT = `
  try {
    var theme = localStorage.getItem('leader-sport-theme');
    var isAdmin = location.pathname.startsWith('/admin');
    var dark = theme === 'dark' || (theme === null && isAdmin);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
`;

// The branded splash (markup below, #app-splash) is always server-rendered
// so there's zero flash on a real first load. This script — not React
// state — decides whether it stays visible, since "have I visited before"
// only exists in localStorage and mixing browser-only state into React's
// render output is exactly what caused this app's earlier locale/theme
// hydration bugs (see CONTEXT_HANDOFF.md). It runs beforeInteractive, i.e.
// before hydration/paint, so there's no flicker either way. Show it only
// on a real reload or the very first visit ever on this browser; any other
// fresh navigation (typed URL, new tab, bookmark) skips it. Quiet reloads
// (the language toggle's forced reload) always skip it regardless.
const SPLASH_INIT_SCRIPT = `
  try {
    var nav = performance.getEntriesByType('navigation')[0];
    var isReload = nav && nav.type === 'reload';
    var isQuiet = document.cookie.indexOf('ls-quiet-reload=') !== -1;
    var hasVisited = localStorage.getItem('ls-visited') === '1';
    var show = (isReload || !hasVisited) && !isQuiet;
    localStorage.setItem('ls-visited', '1');
    if (!show) {
      document.documentElement.setAttribute('data-hide-splash', '1');
    } else {
      setTimeout(function () {
        var el = document.getElementById('app-splash');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(function () { el.style.display = 'none'; }, 400);
      }, 3000);
    }
  } catch (e) {}
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = dictionaries[locale];

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="splash-init" strategy="beforeInteractive">
          {SPLASH_INIT_SCRIPT}
        </Script>
        <div
          id="app-splash"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-400"
        >
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
            <img
              src="/logo-mark.png"
              alt="Leader Sport"
              className="w-[clamp(140px,16vw,220px)]"
            />
            <p className="relative mt-5 text-3xl font-bold tracking-[0.2em] text-slate-100 sm:text-4xl">
              LEADER SPORT
            </p>
            <p className="relative mt-1 text-[11px] tracking-[0.25em] text-slate-500 uppercase">
              {dict.hero.badge}
            </p>
            <div className="relative mt-7 flex gap-2">
              <span className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-500" />
            </div>
          </div>
        </div>
        <TRPCProvider>
          <ThemeProvider>
            <ReloadHomeRedirect />
            <main className="flex flex-1 flex-col">{children}</main>
            <Toaster />
          </ThemeProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
