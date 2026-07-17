export type PaymentMethodKind = "WHISH" | "CARD";

export interface CheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail?: string;
  /** Where the customer lands after paying (success or failure). */
  returnUrl: string;
}

export interface CheckoutResult {
  redirectUrl: string;
  providerReference: string;
}

export interface PaymentProvider {
  method: PaymentMethodKind;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
}
