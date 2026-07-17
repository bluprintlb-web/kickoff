"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLBP } from "@/lib/currency";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { effectiveUnitPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/react";

export function CheckoutForm({ locale }: { locale: Locale }) {
  const dict = dictionaries[locale].checkout;
  const PAYMENT_METHODS = [
    { value: "WHISH", label: dict.whish },
    { value: "CARD", label: dict.card },
  ] as const;

  const router = useRouter();
  const { data: cart } = trpc.cart.get.useQuery();

  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("Lebanon");
  const [paymentMethod, setPaymentMethod] = useState<
    (typeof PAYMENT_METHODS)[number]["value"]
  >("WHISH");

  const checkout = trpc.order.checkout.useMutation({
    onSuccess: (result) => {
      window.location.href = result.redirectUrl;
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        router.push("/login");
        return;
      }
      toast.error(error.message);
    },
  });

  const total =
    cart?.items.reduce(
      (sum, item) => sum + effectiveUnitPrice(item.variant) * item.quantity,
      0
    ) ?? 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    checkout.mutate({
      paymentMethod,
      shippingName,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingCountry,
    });
  }

  if (cart && cart.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-muted-foreground">{dict.emptyNotice}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>

      <Card className="px-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {dict.shippingDetails}
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shippingName">{dict.fullName}</Label>
              <Input
                id="shippingName"
                value={shippingName}
                onChange={(e) => setShippingName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shippingAddress">{dict.address}</Label>
              <Input
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="shippingCity">{dict.city}</Label>
                <Input
                  id="shippingCity"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shippingPostalCode">{dict.postalCode}</Label>
                <Input
                  id="shippingPostalCode"
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shippingCountry">{dict.country}</Label>
              <Input
                id="shippingCountry"
                value={shippingCountry}
                onChange={(e) => setShippingCountry(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-6">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {dict.paymentMethod}
            </p>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    paymentMethod === method.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-6">
            <span className="text-lg font-semibold">
              {dict.total}: <span className="text-brand">${total.toFixed(2)}</span>
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                ({formatLBP(total)})
              </span>
            </span>
            <Button type="submit" size="lg" disabled={checkout.isPending}>
              {checkout.isPending ? dict.redirecting : dict.payNow}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
