"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result && !cancelled) {
          cancelled = true;
          controlsRef.current?.stop();
          onScan(result.getText());
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch(() => {
        setError(
          "Couldn't access the camera. Check camera permissions and try again."
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-md bg-black"
          muted
          playsInline
        />
      )}
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}
