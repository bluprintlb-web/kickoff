"use client";

import { ScanLine } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { effectiveUnitPrice, type Money } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/react";

type SaleLine = {
  variantId: string;
  name: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
};

const PAYMENT_METHODS = ["CASH", "WHISH", "CARD"] as const;

export default function PosPage() {
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("CASH");

  const completeSale = trpc.order.createPosSale.useMutation({
    onSuccess: (order) => {
      toast.success(`Sale complete — $${Number(order.total).toFixed(2)}`);
      setLines([]);
    },
    onError: (error) => toast.error(error.message),
  });

  function addVariantToSale(variant: {
    id: string;
    stock: number;
    size: string | null;
    color: string | null;
    priceOverride: Money;
    product: { name: string; basePrice: Money; salePrice: Money };
  }) {
    if (variant.stock <= 0) {
      toast.error(`${variant.product.name} is out of stock`);
      return;
    }

    setLines((current) => {
      const existing = current.find((line) => line.variantId === variant.id);
      if (existing) {
        return current.map((line) =>
          line.variantId === variant.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      const unitPrice = effectiveUnitPrice(variant);
      return [
        ...current,
        {
          variantId: variant.id,
          name: variant.product.name,
          size: variant.size,
          color: variant.color,
          unitPrice,
          quantity: 1,
        },
      ];
    });
  }

  async function handleScan(barcode: string) {
    setScannerOpen(false);
    const variant = await utils.product.byBarcode.fetch({ barcode });

    if (!variant) {
      toast.error(`No product found for barcode ${barcode}`);
      return;
    }
    addVariantToSale(variant);
  }

  const addedFromQuery = useRef(false);
  useEffect(() => {
    const variantId = searchParams.get("variantId");
    if (!variantId || addedFromQuery.current) return;
    addedFromQuery.current = true;
    utils.product.variantById.fetch({ id: variantId }).then((variant) => {
      if (!variant) {
        toast.error("That item couldn't be found.");
        return;
      }
      addVariantToSale(variant);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function updateQuantity(variantId: string, quantity: number) {
    if (quantity <= 0) {
      setLines((current) => current.filter((line) => line.variantId !== variantId));
      return;
    }
    setLines((current) =>
      current.map((line) =>
        line.variantId === variantId ? { ...line, quantity } : line
      )
    );
  }

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sell (POS)</h1>
        <Button variant="default" size="lg" onClick={() => setScannerOpen(true)}>
          <ScanLine className="size-4" />
          Scan item
        </Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit price</TableHead>
              <TableHead>Line total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.variantId}>
                <TableCell className="font-medium">{line.name}</TableCell>
                <TableCell>
                  {[line.size, line.color].filter(Boolean).join(" / ") || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(line.variantId, line.quantity - 1)}
                    >
                      -
                    </Button>
                    {line.quantity}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(line.variantId, line.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </TableCell>
                <TableCell>${line.unitPrice.toFixed(2)}</TableCell>
                <TableCell className="font-medium text-brand">
                  ${(line.unitPrice * line.quantity).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQuantity(line.variantId, 0)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {lines.length === 0 && (
          <p className="px-6 py-10 text-center text-muted-foreground">
            Scan an item to start a sale.
          </p>
        )}
      </Card>

      <Card className="flex-row flex-wrap items-end justify-between gap-6 px-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Payment method</span>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  paymentMethod === method
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <span className="text-sm text-muted-foreground">
            Total{" "}
            <span className="text-2xl font-bold text-foreground">
              ${total.toFixed(2)}
            </span>
          </span>
          <Button
            variant="default"
            size="lg"
            disabled={lines.length === 0 || completeSale.isPending}
            onClick={() =>
              completeSale.mutate({
                items: lines.map((line) => ({
                  variantId: line.variantId,
                  quantity: line.quantity,
                })),
                paymentMethod,
              })
            }
          >
            {completeSale.isPending ? "Completing..." : "Complete sale"}
          </Button>
        </div>
      </Card>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan item barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
