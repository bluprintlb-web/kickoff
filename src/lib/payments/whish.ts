import "server-only";
import type { CheckoutRequest, CheckoutResult, PaymentProvider } from "@/lib/payments/types";

/**
 * WhishPay integration — STUB, not verified against a live endpoint.
 *
 * As of 2026-07-09 Whish Money doesn't have a public developer portal with
 * stable API docs: the previously-published technical spec
 * (lebsol.com/.../Whish-Collect-Web-Service-Technical-Specification.pdf) is
 * dead, and the reseller docs at pay.codnloc.com are access-restricted
 * without an account.
 *
 * What we do know (from the WordPress/WooCommerce plugin docs for the same
 * gateway): you call a "Collect" endpoint with a merchant secret and order
 * details, it returns a hosted checkout URL, you redirect the customer
 * there — they can pay with either their Whish wallet balance or a
 * Visa/Mastercard card on that same hosted page — and the gateway then
 * calls back a status/webhook endpoint.
 *
 * Before this will actually work:
 *  1. Sign up for a Whish Pay merchant account and get real API docs +
 *     credentials from Whish directly (their public info points to
 *     contacting them — there's no self-serve API reference to link to).
 *  2. Set WHISH_API_BASE_URL and WHISH_API_SECRET in .env.
 *  3. Confirm the exact field names below against what Whish gives you —
 *     everything here is a best-effort shape, not a verified contract.
 *  4. Implement webhook signature verification in
 *     src/app/api/webhooks/whish/route.ts (currently a stub).
 */
export const whishProvider: PaymentProvider = {
  method: "WHISH",
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const secret = process.env.WHISH_API_SECRET;
    const baseUrl = process.env.WHISH_API_BASE_URL;

    if (!secret || !baseUrl) {
      throw new Error(
        "Whish payment provider isn't configured — set WHISH_API_SECRET and WHISH_API_BASE_URL once you have real merchant credentials from Whish."
      );
    }

    const response = await fetch(`${baseUrl}/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        orderId: request.orderId,
        amount: request.amount.toFixed(2),
        currency: request.currency,
        customerName: request.customerName,
        returnUrl: request.returnUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Whish checkout request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { url?: string; id?: string };
    if (!data.url) {
      throw new Error("Whish checkout response did not include a redirect URL");
    }

    return { redirectUrl: data.url, providerReference: data.id ?? "" };
  },
};
