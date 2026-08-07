import { PackagePlus, ScanBarcode } from "lucide-react";
import Link from "next/link";
import { OrderAlertsCard } from "@/components/admin/order-alerts-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { trpcCaller } from "@/trpc/server";

export default async function AdminDashboardPage() {
  const trpc = await trpcCaller();
  const products = await trpc.product.list();

  const variants = products.flatMap((product) => product.variants);
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const outOfStock = variants.filter((variant) => variant.stock === 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-muted-foreground">
          Manage products, orders, and stock from here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={products.length} />
        <StatCard label="Variants" value={variants.length} />
        <StatCard label="Units in stock" value={totalStock} />
        <StatCard
          label="Out of stock"
          value={outOfStock}
          description={
            outOfStock > 0 ? "Needs restocking" : "Every variant is covered"
          }
          badge={
            outOfStock > 0 ? (
              <Badge variant="destructive">Alert</Badge>
            ) : (
              <Badge className="border-transparent bg-brand/10 text-brand">
                Good
              </Badge>
            )
          }
        />
      </div>

      <OrderAlertsCard />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/products/new">
          <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <PackagePlus className="size-5" />
              </div>
              <CardTitle>Scan to add product</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create a product and scan a barcode into each variant instead
                of typing it in.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/pos">
          <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <ScanBarcode className="size-5" />
              </div>
              <CardTitle>Scan to sell (POS)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Scan items to build an in-person sale, take payment, and
                update stock instantly.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
