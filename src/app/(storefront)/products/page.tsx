import { ProductCard } from "@/components/product-card";
import { dictionaries, t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import {
  PRODUCT_CATEGORIES,
  type ProductCategoryValue,
} from "@/lib/product-category";
import { trpcCaller } from "@/trpc/server";

function isProductCategory(value: string): value is ProductCategoryValue {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category && isProductCategory(category) ? category : undefined;

  const [trpc, locale] = await Promise.all([trpcCaller(), getLocale()]);
  const products = await trpc.product.list();
  const dict = dictionaries[locale];
  const filtered = activeCategory
    ? products.filter((product) => product.category === activeCategory)
    : products;

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b bg-gradient-to-r from-accent/10 via-brand/5 to-accent/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="text-3xl font-bold tracking-tight">
              {activeCategory
                ? dict.categories[activeCategory]
                : dict.productsPage.allProducts}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                filtered.length === 1
                  ? dict.productsPage.productsCount
                  : dict.productsPage.productsCountPlural,
                { count: filtered.length }
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">
            {products.length === 0
              ? dict.productsPage.emptyNoProducts
              : dict.productsPage.emptyCategory}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
