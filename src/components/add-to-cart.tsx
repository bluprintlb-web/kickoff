"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dispatchCartItemAdded } from "@/lib/cart-events";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/react";

type VariantOption = {
  id: string;
  size: string | null;
  color: string | null;
  stock: number;
};

export function AddToCart({
  variants,
  locale,
}: {
  variants: VariantOption[];
  locale: Locale;
}) {
  const dict = dictionaries[locale];
  const router = useRouter();
  const [variantId, setVariantId] = useState(
    variants.find((v) => v.stock > 0)?.id ?? ""
  );

  const addItem = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      toast.success(dict.productDetail.addedToCart);
      dispatchCartItemAdded();
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        router.push("/login");
        return;
      }
      toast.error(error.message);
    },
  });

  if (variants.every((v) => v.stock === 0)) {
    return (
      <p className="w-fit rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        {dict.productDetail.outOfStock}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {variants.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {dict.productDetail.chooseOption}
          </span>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const label =
                [variant.size, variant.color].filter(Boolean).join(" / ") ||
                dict.cart.default;
              const outOfStock = variant.stock === 0;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => setVariantId(variant.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                    outOfStock
                      ? "cursor-not-allowed border-border text-muted-foreground/40 line-through"
                      : variantId === variant.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:scale-105 hover:border-primary/50"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Button
        size="lg"
        className="w-fit"
        disabled={!variantId || addItem.isPending}
        onClick={() => addItem.mutate({ variantId })}
      >
        {addItem.isPending
          ? dict.productDetail.adding
          : dict.productDetail.addToCart}
      </Button>
    </div>
  );
}
