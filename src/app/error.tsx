"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        This page couldn&apos;t load — often this means the database isn&apos;t
        connected yet (check <code>DATABASE_URL</code> in <code>.env</code>).
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
