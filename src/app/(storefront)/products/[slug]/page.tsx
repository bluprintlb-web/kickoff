import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { formatLBP } from "@/lib/currency";
import { dictionaries, t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { productName } from "@/lib/i18n/product-name";
import type { ProductCategoryValue } from "@/lib/product-category";
import { trpcCaller } from "@/trpc/server";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [trpc, locale] = await Promise.all([trpcCaller(), getLocale()]);
  const product = await trpc.product.bySlug({ slug });

  if (!product) notFound();

  const dict = dictionaries[locale];
  const Icon = CATEGORY_ICONS[product.category as ProductCategoryValue];
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const displayPrice = Number(product.salePrice ?? product.basePrice);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-16 sm:flex-row sm:gap-12">
      <div className="flex aspect-square w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 via-accent/5 to-brand/10 sm:w-96">
        <Icon className="size-24 text-muted-foreground" strokeWidth={1.25} />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <span className="w-fit rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium tracking-wide text-accent-foreground uppercase">
          {dict.categories[product.category as ProductCategoryValue]}
        </span>
        <h1 className="text-3xl font-bold tracking-tight">
          {productName(product, locale)}
        </h1>

        {product.salePrice != null ? (
          <p className="flex items-center gap-2">
            <span className="text-base text-muted-foreground line-through">
              ${product.basePrice.toString()}
            </span>
            <span className="text-2xl font-semibold text-brand">
              ${product.salePrice.toString()}
            </span>
          </p>
        ) : (
          <p className="text-2xl font-semibold text-brand">
            ${product.basePrice.toString()}
          </p>
        )}
        <p className="-mt-3 text-sm text-muted-foreground">
          {formatLBP(displayPrice)}
        </p>

        {product.description && (
          <p className="text-muted-foreground">{product.description}</p>
        )}

        <p className="text-sm text-muted-foreground">
          {totalStock > 0
            ? t(dict.productDetail.inStock, { count: totalStock })
            : dict.productDetail.outOfStockNotice}
        </p>

        <div className="mt-2 border-t pt-6">
          <AddToCart
            locale={locale}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              size: variant.size,
              color: variant.color,
              stock: variant.stock,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
