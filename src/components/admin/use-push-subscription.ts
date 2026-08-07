"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { trpc } from "@/trpc/react";

// Shared by the header icon button and the dashboard card so there's one
// subscribe/unsubscribe implementation, not two copies drifting apart.

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

// navigator.serviceWorker.ready is a promise that, per spec, never rejects
// — it only resolves once a service worker becomes active for the current
// page's scope. If that never happens (e.g. a scope mismatch, or
// registration silently failing), it hangs forever with no error, which is
// exactly what left this stuck on "Checking notification status..."
// indefinitely. Racing it against a timeout turns that into a real,
// catchable failure instead of a silent hang.
const SERVICE_WORKER_READY_TIMEOUT_MS = 6000;

function serviceWorkerReadyOrTimeout(): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Timed out waiting for the service worker to activate."
            )
          ),
        SERVICE_WORKER_READY_TIMEOUT_MS
      )
    ),
  ]);
}

// Read via useSyncExternalStore, not a useState lazy initializer. This
// project has hit two real hydration-mismatch bugs before (locale, theme —
// see CONTEXT_HANDOFF.md) from reading browser-only state (localStorage,
// document.cookie) during the first render itself; a useState initializer
// that reads navigator/Notification here would be the same anti-pattern.
// getServerSnapshot reports "unsupported" (the only honest answer — the
// server has no navigator/window), and React's own hydration machinery
// re-syncs to the real client value right after mount, with no manual
// mounted-flag effect needed.
function subscribeToNothing() {
  return () => {};
}

function getSupportSnapshot(): SupportStatus {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "supported";
}

function getServerSupportSnapshot(): SupportStatus {
  return "unsupported";
}

export type PushAlertsStatus =
  | "checking"
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed";

export function usePushSubscription() {
  const supportStatus = useSyncExternalStore(
    subscribeToNothing,
    getSupportSnapshot,
    getServerSupportSnapshot
  );
  // undefined = still checking for an existing browser subscription,
  // null = checked, none found, string = checked, found this endpoint.
  const [endpoint, setEndpoint] = useState<string | null | undefined>(
    undefined
  );
  const subscribeMutation = trpc.pushSubscription.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushSubscription.unsubscribe.useMutation();
  const isSubscribedQuery = trpc.pushSubscription.isSubscribed.useQuery(
    { endpoint: endpoint ?? "" },
    { enabled: !!endpoint }
  );

  useEffect(() => {
    if (supportStatus !== "supported") return;
    let cancelled = false;
    serviceWorkerReadyOrTimeout()
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

  async function enable() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error("Push notifications aren't configured yet.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    try {
      const registration = await serviceWorkerReadyOrTimeout();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Browser returned an incomplete subscription");
      }
      await subscribeMutation.mutateAsync({
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

  async function disable() {
    try {
      const registration = await serviceWorkerReadyOrTimeout();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
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

  let status: PushAlertsStatus;
  if (supportStatus === "unsupported") {
    status = "unsupported";
  } else if (supportStatus === "denied") {
    status = "denied";
  } else if (
    endpoint === undefined ||
    (endpoint && isSubscribedQuery.data === undefined)
  ) {
    status = "checking";
  } else if (endpoint && isSubscribedQuery.data === true) {
    status = "subscribed";
  } else {
    status = "unsubscribed";
  }

  return {
    status,
    enable,
    disable,
    isPending: subscribeMutation.isPending || unsubscribeMutation.isPending,
  };
}
