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
        Notifications blocked
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
      >
        <BellRing className="size-3.5" />
        Notifications on
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
    >
      <Bell className="size-3.5" />
      Enable order alerts
    </Button>
  );
}
