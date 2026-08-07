"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  Lock,
  Pencil,
  Search,
  ShoppingBag,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Barcode } from "@/components/barcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { CATEGORY_LABELS, PRODUCT_CATEGORIES } from "@/lib/product-category";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/react";

type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  category: (typeof PRODUCT_CATEGORIES)[number];
  basePrice: string;
  salePrice: string | null;
  isActive: boolean;
  sold: number;
  revenue: number;
  variants: { id: string; barcode: string | null; stock: number }[];
};

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "price", label: "Price" },
  { value: "stock", label: "Stock" },
  { value: "sold", label: "Sold" },
  { value: "revenue", label: "Revenue" },
] as const;

function totalStock(product: AdminProduct) {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

// Solid colored status pills, matching alexph.one's inventory table.
function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="solid-destructive">Out of stock</Badge>;
  if (stock <= 5) return <Badge variant="solid-warning">Low stock</Badge>;
  return <Badge variant="solid-success">In stock</Badge>;
}

export function AdminProductsTable({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("name");

  const [costsUnlocked, setCostsUnlocked] = useState(false);
  const [costs, setCosts] = useState<Record<string, string | null>>({});
  const [pin, setPin] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const revealAllCostPrices = trpc.product.revealAllCostPrices.useQuery(
    { pin },
    { enabled: false }
  );

  async function handleUnlockCosts() {
    const result = await revealAllCostPrices.refetch();
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    const map: Record<string, string | null> = {};
    for (const row of result.data ?? []) {
      map[row.id] = row.costPrice != null ? String(row.costPrice) : null;
    }
    setCosts(map);
    setCostsUnlocked(true);
    setPinDialogOpen(false);
    setPin("");
  }

  function handleToggleCosts() {
    if (costsUnlocked) {
      setCostsUnlocked(false);
      setCosts({});
      return;
    }
    setPinDialogOpen(true);
  }

  const setActive = trpc.product.setActive.useMutation({
    onSuccess: () => router.refresh(),
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    let rows = products.filter((p) =>
      p.name.toLowerCase().includes(search.trim().toLowerCase())
    );
    if (category !== "ALL") {
      rows = rows.filter((p) => p.category === category);
    }
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "price":
          return Number(b.basePrice) - Number(a.basePrice);
        case "stock":
          return totalStock(b) - totalStock(a);
        case "sold":
          return b.sold - a.sold;
        case "revenue":
          return b.revenue - a.revenue;
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return rows;
  }, [products, search, category, sort]);

  function toggleArchive(product: AdminProduct) {
    const archiving = product.isActive;
    if (
      archiving &&
      !window.confirm(`Archive "${product.name}"? It'll be hidden from the storefront.`)
    ) {
      return;
    }
    setActive.mutate({ id: product.id, isActive: !product.isActive });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => v && setSort(v as typeof sort)}>
          <SelectTrigger className="w-36">
            <ArrowUpDown className="size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={handleToggleCosts}
        >
          {costsUnlocked ? (
            <Unlock className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
          )}
          {costsUnlocked ? "Hide costs" : "Show costs"}
        </Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              {costsUnlocked && <TableHead>Cost</TableHead>}
              <TableHead>Stock</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product) => {
              const Icon = CATEGORY_ICONS[product.category];
              const stock = totalStock(product);
              const barcodeVariant = product.variants.find((v) => v.barcode);
              const soleVariant =
                product.variants.length === 1 ? product.variants[0] : null;
              const cost = costs[product.id];

              return (
                <TableRow
                  key={product.id}
                  className={cn(
                    "transition-colors hover:bg-muted/40",
                    !product.isActive && "opacity-50"
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 via-accent/5 to-brand/10">
                        <Icon className="size-5 text-muted-foreground" strokeWidth={1.25} />
                      </div>
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[product.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.salePrice != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground line-through">
                          ${product.basePrice}
                        </span>
                        <span className="font-medium text-brand">
                          ${product.salePrice}
                        </span>
                      </div>
                    ) : (
                      <span>${product.basePrice}</span>
                    )}
                  </TableCell>
                  {costsUnlocked && (
                    <TableCell className="text-muted-foreground">
                      {cost != null ? `$${cost}` : "—"}
                    </TableCell>
                  )}
                  <TableCell>{stock}</TableCell>
                  <TableCell>{product.sold}</TableCell>
                  <TableCell>${product.revenue.toFixed(2)}</TableCell>
                  <TableCell>
                    {product.isActive ? (
                      <StockBadge stock={stock} />
                    ) : (
                      <Badge variant="secondary">Archived</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {barcodeVariant?.barcode ? (
                      <Barcode value={barcodeVariant.barcode} className="h-10" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No barcode</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={
                          soleVariant
                            ? `/admin/pos?variantId=${soleVariant.id}`
                            : "/admin/pos"
                        }
                      >
                        <Button type="button" variant="sale" size="sm">
                          <ShoppingBag className="size-3.5" />
                          Sale
                        </Button>
                      </Link>
                      <Link href={`/admin/products/${product.id}/edit`}>
                        <Button type="button" variant="edit" size="sm">
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant={product.isActive ? "solid-destructive" : "solid-success"}
                        size="sm"
                        onClick={() => toggleArchive(product)}
                        disabled={setActive.isPending}
                      >
                        {product.isActive ? (
                          <Archive className="size-3.5" />
                        ) : (
                          <ArchiveRestore className="size-3.5" />
                        )}
                        {product.isActive ? "Archive" : "Restore"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="px-6 py-8 text-center text-muted-foreground">
            No products match.
          </p>
        )}
      </Card>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlockCosts();
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
            <Button type="submit" disabled={revealAllCostPrices.isFetching}>
              {revealAllCostPrices.isFetching ? "Checking..." : "Unlock"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
