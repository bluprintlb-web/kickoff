import { whishProvider } from "@/lib/payments/whish";
import type { PaymentMethodKind, PaymentProvider } from "@/lib/payments/types";

// Visa/Mastercard are accepted through the same Whish-hosted checkout page
// (their Collect flow lets the customer choose wallet or card at payment
// time) — CARD routes through the same provider. If a dedicated card
// processor is added later, register it here instead.
const providers: Record<PaymentMethodKind, PaymentProvider> = {
  WHISH: whishProvider,
  CARD: whishProvider,
};

export function getPaymentProvider(method: PaymentMethodKind): PaymentProvider {
  return providers[method];
}

export type {
  CheckoutRequest,
  CheckoutResult,
  PaymentProvider,
  PaymentMethodKind,
} from "@/lib/payments/types";
