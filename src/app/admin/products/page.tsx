import Link from "next/link";
import { AdminProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import { trpcCaller } from "@/trpc/server";

export default async function AdminProductsPage() {
  const trpc = await trpcCaller();
  const products = await trpc.product.adminList();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length === 1 ? "" : "s"} in
            your catalog.
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="default">New product</Button>
        </Link>
      </div>

      <AdminProductsTable
        products={products.map((p) => ({
          ...p,
          basePrice: p.basePrice.toString(),
          salePrice: p.salePrice?.toString() ?? null,
        }))}
      />
    </div>
  );
}
