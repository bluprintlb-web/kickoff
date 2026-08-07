import webpush from "web-push";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export type OrderPushPayload = {
  orderId: string;
  customerName: string;
  total: number;
  itemCount: number;
};

// Sends a browser push notification to every device the admin has enabled
// notifications on (see push-subscription router / push-notifications
// button) the moment a real order is placed. Entirely optional: if the
// VAPID env vars aren't set, or there are no subscriptions yet, this
// silently does nothing — same fire-and-forget, never-break-checkout
// design as the WhatsApp notifier it replaces (src/lib/notify-order.ts,
// left dormant/unused rather than deleted).
export function notifyAdminsOfOrder(payload: OrderPushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return;

  after(async () => {
    const subscriptions = await prisma.pushSubscription.findMany();
    if (subscriptions.length === 0) return;

    const body = JSON.stringify({
      title: "New order",
      body: `${payload.customerName} — ${payload.itemCount} item${payload.itemCount === 1 ? "" : "s"} — $${payload.total.toFixed(2)}`,
      // No order list/detail page exists in admin yet (a known, separate
      // gap — see CONTEXT_HANDOFF.md's "Next Steps") to deep-link to, so
      // this opens the dashboard for now. Update once that page exists.
      url: `/admin`,
      orderId: payload.orderId,
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body
          );
        } catch (err) {
          const statusCode =
            err && typeof err === "object" && "statusCode" in err
              ? (err as { statusCode?: number }).statusCode
              : undefined;
          // 404/410 mean the browser has permanently invalidated this
          // subscription (uninstalled, cleared data, revoked permission,
          // ...) — clean it up rather than retrying it forever.
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error("[push-notify] failed to send to a subscription:", err);
          }
        }
      })
    );
  });
}
