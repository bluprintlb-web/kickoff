"use client";

import { Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGE_GROUPS, PRODUCT_CATEGORIES } from "@/lib/product-category";
import { GLOVE_SIZES, sizesForAgeGroup } from "@/lib/sizes";
import { slugify } from "@/lib/slugify";
import { trpc } from "@/trpc/react";

type VariantRow = {
  clientId: string;
  id?: string;
  size: string;
  color: string;
  stock: string;
  barcode: string;
};

function newVariantRow(): VariantRow {
  return {
    clientId: crypto.randomUUID(),
    size: "",
    color: "",
    stock: "0",
    barcode: "",
  };
}

// Sizing only applies to Jerseys (Kids/Mens ladder, via ageGroup) and Gloves
// (a fixed numeric ladder — gloves aren't split by kids/mens here). Every
// other category keeps the flexible free-form variant list.
function fixedSizesFor(
  category: (typeof PRODUCT_CATEGORIES)[number],
  ageGroup: (typeof AGE_GROUPS)[number] | "NONE"
): readonly string[] {
  if (category === "GLOVES") return GLOVE_SIZES;
  if (category === "JERSEY") return sizesForAgeGroup(ageGroup === "NONE" ? undefined : ageGroup);
  return [];
}

// One row per size, in order, instead of the admin manually adding rows and
// picking a size each time. Existing stock/barcode for a size (editing)
// carries over; sizes with no saved variant yet start at 0.
function sizeGridRows(sizes: readonly string[], existing: VariantRow[]): VariantRow[] {
  const bySize = new Map(existing.map((row) => [row.size, row]));
  return sizes.map((size) => {
    const match = bySize.get(size);
    return {
      clientId: match?.clientId ?? crypto.randomUUID(),
      id: match?.id,
      size,
      color: match?.color ?? "",
      stock: match?.stock ?? "0",
      barcode: match?.barcode ?? "",
    };
  });
}

export type ProductFormInitialData = {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  description: string | null;
  category: (typeof PRODUCT_CATEGORIES)[number];
  ageGroup: (typeof AGE_GROUPS)[number] | null;
  basePrice: string;
  salePrice: string | null;
  variants: {
    id: string;
    size: string | null;
    color: string | null;
    stock: number;
    barcode: string | null;
  }[];
};

export function ProductForm({ initial }: { initial?: ProductFormInitialData }) {
  const router = useRouter();
  const isEditing = Boolean(initial);

  const createProduct = trpc.product.create.useMutation({
    onSuccess: () => {
      toast.success("Product created");
      router.push("/admin/products");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateProduct = trpc.product.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated");
      router.push("/admin/products");
    },
    onError: (error) => toast.error(error.message),
  });

  const [name, setName] = useState(initial?.name ?? "");
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [category, setCategory] = useState<(typeof PRODUCT_CATEGORIES)[number]>(
    initial?.category ?? "JERSEY"
  );
  const [ageGroup, setAgeGroup] = useState<(typeof AGE_GROUPS)[number] | "NONE">(
    initial?.ageGroup ?? "NONE"
  );
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? "");
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? "");
  const initialVariantRows: VariantRow[] = initial?.variants.length
    ? initial.variants.map((v) => ({
        clientId: crypto.randomUUID(),
        id: v.id,
        size: v.size ?? "",
        color: v.color ?? "",
        stock: String(v.stock),
        barcode: v.barcode ?? "",
      }))
    : [newVariantRow()];
  const initialFixedSizes = initial
    ? fixedSizesFor(initial.category, initial.ageGroup ?? "NONE")
    : [];
  const [variants, setVariants] = useState<VariantRow[]>(
    initialFixedSizes.length > 0
      ? sizeGridRows(initialFixedSizes, initialVariantRows)
      : initialVariantRows
  );
  const [scanningRowId, setScanningRowId] = useState<string | null>(null);

  // Cost price is never fetched until the PIN is verified — costUnlocked
  // just tracks whether that's happened this session; costPrice stays ""
  // (and un-submitted, so it's left untouched) until then.
  const [costUnlocked, setCostUnlocked] = useState(false);
  const [costPrice, setCostPrice] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const revealCostPrice = trpc.product.revealCostPrice.useQuery(
    { pin, id: initial?.id },
    { enabled: false }
  );

  async function handleUnlockCost() {
    const result = await revealCostPrice.refetch();
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setCostUnlocked(true);
    setCostPrice(result.data != null ? String(result.data) : "");
    setPinDialogOpen(false);
    setPin("");
  }

  const fixedSizes = fixedSizesFor(category, ageGroup);
  const isSized = fixedSizes.length > 0;
  const pending = createProduct.isPending || updateProduct.isPending;

  function handleCategoryChange(value: (typeof PRODUCT_CATEGORIES)[number]) {
    setCategory(value);
    setAgeGroup("NONE");
    setVariants(value === "GLOVES" ? sizeGridRows(GLOVE_SIZES, []) : [newVariantRow()]);
  }

  function handleAgeGroupChange(value: (typeof AGE_GROUPS)[number] | "NONE") {
    setAgeGroup(value);
    if (value === "KIDS" || value === "ADULT") {
      setVariants((rows) => sizeGridRows(sizesForAgeGroup(value), rows));
    } else {
      setVariants([newVariantRow()]);
    }
  }

  function updateVariant(clientId: string, patch: Partial<VariantRow>) {
    setVariants((rows) =>
      rows.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid base price");
      return;
    }
    if (salePrice && (!Number.isFinite(Number(salePrice)) || Number(salePrice) <= 0)) {
      toast.error("Enter a valid sale price, or leave it blank");
      return;
    }
    if (costUnlocked && costPrice && !Number.isFinite(Number(costPrice))) {
      toast.error("Enter a valid cost price");
      return;
    }

    const variantInput = variants
      .filter((row) => row.size || row.color || row.barcode || Number(row.stock) > 0)
      .map((row) => ({
        id: row.id,
        size: row.size || undefined,
        color: row.color || undefined,
        stock: Number(row.stock) || 0,
        barcode: row.barcode || undefined,
      }));

    const shared = {
      name,
      nameAr: nameAr || undefined,
      slug,
      category,
      ageGroup: ageGroup === "NONE" ? undefined : ageGroup,
      basePrice: price,
      salePrice: salePrice ? Number(salePrice) : undefined,
      // Only send costPrice if the admin actually unlocked (and possibly
      // edited) it this session — otherwise leave it untouched server-side.
      costPrice: costUnlocked && costPrice ? Number(costPrice) : undefined,
      variants: variantInput,
    };

    if (initial) {
      updateProduct.mutate({ id: initial.id, ...shared });
    } else {
      createProduct.mutate(shared);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{isEditing ? "Edit product" : "New product"}</h1>

      <Card className="max-w-2xl px-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nameAr">Name (Arabic)</Label>
            <Input
              id="nameAr"
              dir="auto"
              placeholder="Optional — shown to customers when site language is Arabic"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  value && handleCategoryChange(value as (typeof PRODUCT_CATEGORIES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {category === "JERSEY" && (
              <div className="flex flex-col gap-2">
                <Label>Mens or kids?</Label>
                <Select
                  value={ageGroup}
                  onValueChange={(value) =>
                    value &&
                    handleAgeGroupChange(value as (typeof AGE_GROUPS)[number] | "NONE")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Choose one…</SelectItem>
                    <SelectItem value="KIDS">Kids (20–30)</SelectItem>
                    <SelectItem value="ADULT">Mens (S–2XL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="basePrice">Base price (USD)</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="salePrice">Sale price (optional)</Label>
              <Input
                id="salePrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank if not on sale"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-md border p-3">
            <Label className="flex items-center gap-1.5">
              {costUnlocked ? (
                <Unlock className="size-3.5" />
              ) : (
                <Lock className="size-3.5" />
              )}
              Cost price (private)
            </Label>
            {costUnlocked ? (
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="What you paid for this item"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="max-w-48"
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setPinDialogOpen(true)}
              >
                Enter PIN to view/edit
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>{isSized ? "Sizes" : "Variants"}</Label>
              {!isSized && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariants((rows) => [...rows, newVariantRow()])}
                >
                  Add variant
                </Button>
              )}
            </div>
            {isSized && (
              <p className="text-xs text-muted-foreground">
                Enter how many of each size you have. Leave a size at 0 if you
                don&apos;t carry it.
              </p>
            )}

            {variants.map((row) => (
              <div
                key={row.clientId}
                className={
                  isSized
                    ? "grid grid-cols-[60px_1fr_1fr_auto] items-end gap-2 rounded-md border p-3"
                    : "grid grid-cols-[1fr_1fr_80px_1fr_auto_auto] items-end gap-2 rounded-md border p-3"
                }
              >
                {isSized ? (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Size</Label>
                    <p className="flex h-9 items-center text-sm font-semibold">
                      {row.size}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Size</Label>
                    <Input
                      value={row.size}
                      onChange={(e) => updateVariant(row.clientId, { size: e.target.value })}
                    />
                  </div>
                )}

                {!isSized && (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Color</Label>
                    <Input
                      value={row.color}
                      onChange={(e) => updateVariant(row.clientId, { color: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={row.stock}
                    onChange={(e) => updateVariant(row.clientId, { stock: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Barcode</Label>
                  <Input
                    value={row.barcode}
                    onChange={(e) =>
                      updateVariant(row.clientId, { barcode: e.target.value })
                    }
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setScanningRowId(row.clientId)}
                >
                  Scan
                </Button>

                {!isSized && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setVariants((rows) => rows.filter((r) => r.clientId !== row.clientId))
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button type="submit" variant="default" disabled={pending}>
            {pending
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save changes"
                : "Create product"}
          </Button>
        </form>
      </Card>

      <Dialog open={scanningRowId !== null} onOpenChange={(open) => !open && setScanningRowId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan barcode</DialogTitle>
          </DialogHeader>
          {scanningRowId && (
            <BarcodeScanner
              onScan={(code) => {
                updateVariant(scanningRowId, { barcode: code });
                setScanningRowId(null);
              }}
              onClose={() => setScanningRowId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlockCost();
            }}
            className="flex flex-col gap-3"
          >
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <Button type="submit" disabled={revealCostPrice.isFetching}>
              {revealCostPrice.isFetching ? "Checking..." : "Unlock"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
