import "dotenv/config";
import express from "express";
import { z } from "zod";
import { sendOrderMessage, startWhatsApp } from "./whatsapp.js";

const app = express();
app.use(express.json());

// No CORS middleware here on purpose. This endpoint is never called from a
// browser — it's called server-to-server from the Kick Off Next.js app's
// own backend, authenticated with a shared secret (below), not by origin.
// Adding permissive CORS would only widen who can reach this from a
// browser context for no benefit.

const OrderNotificationSchema = z.object({
  orderId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        size: z.string().nullable().optional(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
      })
    )
    .min(1),
  total: z.number().nonnegative(),
  address: z.object({
    line1: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().nullable().optional(),
    country: z.string().min(1),
  }),
});

function formatMessage(order) {
  const itemLines = order.items
    .map((item) => {
      const size = item.size ? ` (${item.size})` : "";
      const lineTotal = (item.unitPrice * item.quantity).toFixed(2);
      return `• ${item.name}${size} × ${item.quantity} — $${lineTotal}`;
    })
    .join("\n");

  return [
    `🛒 *New order* #${order.orderId}`,
    "",
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone || "Not provided"}`,
    "",
    "Items:",
    itemLines,
    "",
    `Total: $${order.total.toFixed(2)}`,
    "",
    "Ship to:",
    order.address.line1,
    `${order.address.city}${order.address.postalCode ? ", " + order.address.postalCode : ""}`,
    order.address.country,
  ].join("\n");
}

// Shared-secret auth — checked before touching the body at all. Compared
// with a fixed-length check isn't done here since this header is a random
// long secret compared once per request at low volume; not a high-value
// timing-attack target the way a login password would be.
function requireSecret(req, res, next) {
  const provided = req.header("x-webhook-secret");
  if (!process.env.NOTIFY_SECRET) {
    console.error("[server] NOTIFY_SECRET is not set — refusing all requests");
    return res.status(500).json({ success: false, error: "Server misconfigured" });
  }
  if (provided !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/notify-order", requireSecret, async (req, res) => {
  const parsed = OrderNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid order payload",
      details: parsed.error.flatten(),
    });
  }

  try {
    const message = formatMessage(parsed.data);
    await sendOrderMessage(message);
    return res.json({ success: true });
  } catch (err) {
    console.error("[server] failed to send WhatsApp notification:", err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to send WhatsApp message",
    });
  }
});

const PORT = process.env.PORT || 3300;

startWhatsApp().catch((err) => {
  console.error("[whatsapp] failed to start:", err);
});

app.listen(PORT, () => {
  console.log(`[server] whatsapp-notifier listening on port ${PORT}`);
});
