"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/components/admin/use-push-subscription";

export function PushNotificationsButton() {
  const { status, enable, disable, isPending } = usePushSubscription();

  if (status === "unsupported" || status === "checking") return null;

  if (status === "denied") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        title="Notifications are blocked for this site in your browser settings — re-enable them there, then reload."
      >
        <BellOff className="size-3.5" />
        <span className="hidden sm:inline">Notifications blocked</span>
      </Button>
    );
  }

  if (status === "subscribed") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={disable}
        disabled={isPending}
        title="Order notifications are on for this device — tap to turn off"
      >
        <BellRing className="size-3.5" />
        <span className="hidden sm:inline">Notifications on</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={enable}
      disabled={isPending}
      title="Enable order alerts"
    >
      <Bell className="size-3.5" />
      <span className="hidden sm:inline">Enable order alerts</span>
    </Button>
  );
}
