import { CheckoutForm } from "@/components/checkout-form";
import { getLocale } from "@/lib/i18n/get-locale";

export default async function CheckoutPage() {
  const locale = await getLocale();
  return <CheckoutForm locale={locale} />;
}
