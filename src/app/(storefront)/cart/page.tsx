import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CartItemRow } from "@/components/cart-item-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatLBP } from "@/lib/currency";
import { verifySession } from "@/lib/dal";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { productName } from "@/lib/i18n/product-name";
import { effectiveUnitPrice } from "@/lib/pricing";
import { trpcCaller } from "@/trpc/server";

export default async function CartPage() {
  await verifySession();
  const [trpc, locale] = await Promise.all([trpcCaller(), getLocale()]);
  const cart = await trpc.cart.get();
  const dict = dictionaries[locale];

  const total = cart.items.reduce(
    (sum, item) => sum + effectiveUnitPrice(item.variant) * item.quantity,
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{dict.cart.title}</h1>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingCart className="size-5" />
          </div>
          <p className="text-muted-foreground">{dict.cart.empty}</p>
          <Link href="/products">
            <Button variant="outline">{dict.cart.browse}</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="gap-0 divide-y py-0">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                locale={locale}
                item={{
                  variantId: item.variantId,
                  name: productName(item.variant.product, locale),
                  size: item.variant.size,
                  color: item.variant.color,
                  unitPrice: effectiveUnitPrice(item.variant),
                  quantity: item.quantity,
                }}
              />
            ))}
          </Card>
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 px-5 py-4">
            <span className="text-lg font-semibold">
              {dict.cart.total}:{" "}
              <span className="text-brand">${total.toFixed(2)}</span>
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                ({formatLBP(total)})
              </span>
            </span>
            <Link href="/checkout">
              <Button size="lg">{dict.cart.checkout}</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
