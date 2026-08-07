import { after } from "next/server";

export type OrderNotificationPayload = {
  orderId: string;
  customerName: string;
  customerPhone?: string | null;
  items: {
    name: string;
    size?: string | null;
    quantity: number;
    unitPrice: number;
  }[];
  total: number;
  address: {
    line1: string;
    city: string;
    postalCode?: string | null;
    country: string;
  };
};

// Sends the store owner a WhatsApp message for a real order via the
// whatsapp-notifier service (see whatsapp-notifier/README.md at the repo
// root — a separate always-on Node service, since the WhatsApp connection
// can't live inside this app's own Vercel deployment). Entirely optional:
// if NOTIFY_ORDER_URL/SECRET aren't set, this silently does nothing rather
// than breaking checkout for anyone who hasn't set the bot up.
//
// Scheduled with Next's `after()` (stable since Next 15.1, see
// node_modules/next/dist/docs/.../after.md) rather than a bare unawaited
// promise — `after` is what actually keeps a background task alive past
// the response on Vercel (via `waitUntil`); an unawaited fetch can get cut
// off the moment the response is sent. Errors here are caught and logged,
// never thrown — a WhatsApp outage must never fail a real checkout.
export function notifyOwnerOfOrder(payload: OrderNotificationPayload) {
  const url = process.env.NOTIFY_ORDER_URL;
  const secret = process.env.NOTIFY_ORDER_SECRET;
  if (!url || !secret) return;

  after(async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": secret,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) {
        console.error(
          "[notify-order] whatsapp-notifier returned",
          res.status,
          await res.text().catch(() => "")
        );
      }
    } catch (err) {
      console.error("[notify-order] failed to reach whatsapp-notifier:", err);
    }
  });
}
