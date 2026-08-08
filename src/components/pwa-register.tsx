"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Chromium fires this before showing its own install UI; it's not in
// lib.dom.d.ts since it's non-standard, so it's typed locally.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Mounted in both SiteHeader (storefront) and the admin layout header —
// site-wide now, not admin-only (see src/app/manifest.ts, src/app/sw.js).
// Whichever one happens to be on screen when the browser fires
// beforeinstallprompt catches it; harmless for both to listen since a page
// is always exactly one or the other.
export function PwaRegister({ className }: { className?: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // No offline fallback / install prompt this session — not worth surfacing.
      });
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!installPrompt) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      title="Install app"
      onClick={async () => {
        await installPrompt.prompt();
        setInstallPrompt(null);
      }}
    >
      <Download className="size-3.5" />
      <span className="hidden sm:inline">Install app</span>
    </Button>
  );
}
