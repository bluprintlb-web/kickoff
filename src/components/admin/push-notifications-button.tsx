"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/react";

// VAPID public keys are handed to pushManager.subscribe() as a raw
// Uint8Array, not the base64url string env vars naturally hold — this is
// the standard conversion (browsers don't do it for you).
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type SupportStatus = "unsupported" | "denied" | "supported";

// Synchronous browser feature/permission checks — computed once as a
// useState lazy initializer rather than set from inside an effect body,
// so there's nothing here for the "don't setState synchronously in an
// effect" rule to flag (see the async subscription-lookup effect below,
// which correctly does its setState inside a .then() callback instead).
function getSupportStatus(): SupportStatus {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "supported";
}

export function PushNotificationsButton() {
  const [supportStatus] = useState<SupportStatus>(getSupportStatus);
  // undefined = still checking for an existing browser subscription,
  // null = checked, none found, string = checked, found this endpoint.
  const [endpoint, setEndpoint] = useState<string | null | undefined>(
    undefined
  );
  const subscribe = trpc.pushSubscription.subscribe.useMutation();
  const unsubscribe = trpc.pushSubscription.unsubscribe.useMutation();
  const isSubscribedQuery = trpc.pushSubscription.isSubscribed.useQuery(
    { endpoint: endpoint ?? "" },
    { enabled: !!endpoint }
  );

  useEffect(() => {
    if (supportStatus !== "supported") return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((existing) => {
        if (!cancelled) setEndpoint(existing?.endpoint ?? null);
      })
      .catch(() => {
        if (!cancelled) setEndpoint(null);
      });
    return () => {
      cancelled = true;
    };
  }, [supportStatus]);

  async function handleEnable() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error("Push notifications aren't configured yet.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Browser returned an incomplete subscription");
      }
      await subscribe.mutateAsync({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setEndpoint(json.endpoint);
      toast.success("Order notifications enabled on this device.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't enable notifications."
      );
    }
  }

  async function handleDisable() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribe.mutateAsync({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEndpoint(null);
      toast.success("Order notifications turned off on this device.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't disable notifications."
      );
    }
  }

  if (supportStatus === "unsupported") return null;

  if (supportStatus === "denied") {
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

  // Still checking for an existing subscription, or the server round-trip
  // to confirm it's still valid server-side hasn't resolved yet.
  if (endpoint === undefined || (endpoint && isSubscribedQuery.data === undefined)) {
    return null;
  }

  const isSubscribed = !!endpoint && isSubscribedQuery.data === true;

  if (isSubscribed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDisable}
        disabled={unsubscribe.isPending}
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
      onClick={handleEnable}
      disabled={subscribe.isPending}
    >
      <Bell className="size-3.5" />
      Enable order alerts
    </Button>
  );
}
