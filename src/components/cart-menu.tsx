"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLBP } from "@/lib/currency";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { productName } from "@/lib/i18n/product-name";
import { effectiveUnitPrice } from "@/lib/pricing";
import { trpc } from "@/trpc/react";

// Cart contents are fetched lazily, only once the menu is actually opened —
// the header only needs to show a badge count until then, which the server
// component that renders this already knows.
export function CartMenu({
  initialCount,
  locale,
  isLoggedIn,
}: {
  initialCount: number;
  locale: Locale;
  isLoggedIn: boolean;
}) {
  const dict = dictionaries[locale].cartMenu;
  const logInLabel = dictionaries[locale].nav.logIn;
  const [open, setOpen] = useState(false);
  const { data: cart, isLoading } = trpc.cart.get.useQuery(undefined, {
    enabled: open && isLoggedIn,
  });

  const items = cart?.items ?? [];
  const count = cart
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : initialCount;
  const total = items.reduce(
    (sum, item) => sum + effectiveUnitPrice(item.variant) * item.quantity,
    0
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative flex items-center transition-colors hover:text-accent"
        aria-label="Cart"
      >
        <ShoppingCart className="size-5" />
        {count > 0 && (
          <Badge
            variant="accent"
            className="absolute -top-2 -right-2 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {count}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {!isLoggedIn ? (
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {dict.signInPrompt}
            </p>
            <Link href="/login" className="w-full" onClick={() => setOpen(false)}>
              <Button className="w-full">{logInLabel}</Button>
            </Link>
          </div>
        ) : isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {dict.loading}
          </p>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {dict.empty}
          </p>
        ) : (
          <>
            <div className="flex max-h-72 flex-col divide-y overflow-y-auto">
              {items.map((item) => {
                const lineTotal =
                  effectiveUnitPrice(item.variant) * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {productName(item.variant.product, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[item.variant.size, item.variant.color]
                          .filter(Boolean)
                          .join(" / ")}
                        {" · "}
                        {item.quantity}×
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-brand">
                        ${lineTotal.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatLBP(lineTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                {dict.total}
              </span>
              <div className="text-right">
                <p className="text-sm font-semibold text-brand">
                  ${total.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatLBP(total)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 border-t p-3">
              <Link href="/cart" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">
                  {dict.viewCart}
                </Button>
              </Link>
              <Link
                href="/checkout"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                <Button className="w-full">{dict.checkout}</Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
