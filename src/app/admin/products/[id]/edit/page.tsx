import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { trpcCaller } from "@/trpc/server";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trpc = await trpcCaller();
  const product = await trpc.product.byId({ id });

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      initial={{
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        slug: product.slug,
        description: product.description,
        category: product.category,
        ageGroup: product.ageGroup,
        basePrice: product.basePrice.toString(),
        salePrice: product.salePrice?.toString() ?? null,
        variants: product.variants,
      }}
    />
  );
}
