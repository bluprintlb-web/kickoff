import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-5" />
      </div>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page needs a connection to load fresh data. Reconnect and
        refresh — stock counts and orders can change any time, so nothing
        here is cached for offline editing.
      </p>
    </div>
  );
}
