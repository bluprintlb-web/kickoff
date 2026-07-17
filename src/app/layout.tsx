import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReloadHomeRedirect } from "@/components/reload-home-redirect";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
