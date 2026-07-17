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

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/admin/sw.js", { scope: "/admin/" })
        .catch(() => {
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
      className="w-full"
      onClick={async () => {
        await installPrompt.prompt();
        setInstallPrompt(null);
      }}
    >
      <Download className="size-3.5" />
      Install app
    </Button>
  );
}
