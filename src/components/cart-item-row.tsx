"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatLBP } from "@/lib/currency";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { trpc } from "@/trpc/react";

type CartLine = {
  variantId: string;
  name: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
};

export function CartItemRow({
  item,
  locale,
}: {
  item: CartLine;
  locale: Locale;
}) {
  const dict = dictionaries[locale].cart;
  const router = useRouter();
  const updateItem = trpc.cart.updateItem.useMutation({
    onSuccess: () => router.refresh(),
  });
  const lineTotal = item.unitPrice * item.quantity;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {[item.size, item.color].filter(Boolean).join(" / ") || dict.default}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={updateItem.isPending}
          onClick={() =>
            updateItem.mutate({
              variantId: item.variantId,
              quantity: item.quantity - 1,
            })
          }
        >
          -
        </Button>
        <span className="w-4 text-center">{item.quantity}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={updateItem.isPending}
          onClick={() =>
            updateItem.mutate({
              variantId: item.variantId,
              quantity: item.quantity + 1,
            })
          }
        >
          +
        </Button>
      </div>
      <div className="w-24 text-right">
        <p className="font-medium text-brand">${lineTotal.toFixed(2)}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatLBP(lineTotal)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => updateItem.mutate({ variantId: item.variantId, quantity: 0 })}
      >
        {dict.remove}
      </Button>
    </div>
  );
}
