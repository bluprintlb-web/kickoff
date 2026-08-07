"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePushSubscription } from "@/components/admin/use-push-subscription";

// Deliberately never renders nothing — every status below shows real text,
// unlike the header icon button (which intentionally stays quiet/hidden in
// most states). This exists specifically because that header button turned
// out to be too easy to miss/lose track of; this card is the "can't miss
// it" version on the dashboard itself, sharing the same underlying
// subscribe/unsubscribe logic via usePushSubscription.
export function OrderAlertsCard() {
  const { status, enable, disable, isPending } = usePushSubscription();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
          {status === "subscribed" ? (
            <BellRing className="size-5" />
          ) : status === "denied" ? (
            <BellOff className="size-5" />
          ) : (
            <Bell className="size-5" />
          )}
        </div>
        <div>
          <CardTitle>Order alerts</CardTitle>
          <CardDescription>
            Get a browser notification on this device when a new order comes
            in.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {status === "checking" && (
          <p className="text-sm text-muted-foreground">
            Checking notification status…
          </p>
        )}

        {status === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            This browser doesn&apos;t support push notifications. Try Chrome
            or Edge on this device.
          </p>
        )}

        {status === "denied" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Notifications are blocked for this site in your browser
              settings. Re-enable them there, then reload this page.
            </p>
            <Button type="button" variant="outline" size="sm" disabled>
              <BellOff className="size-3.5" />
              Notifications blocked
            </Button>
          </div>
        )}

        {status === "subscribed" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-brand">
              Order alerts are on for this device.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={disable}
              disabled={isPending}
              className="w-fit"
            >
              <BellRing className="size-3.5" />
              Turn off
            </Button>
          </div>
        )}

        {status === "unsubscribed" && (
          <Button
            type="button"
            size="sm"
            onClick={enable}
            disabled={isPending}
          >
            <Bell className="size-3.5" />
            Enable order alerts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
