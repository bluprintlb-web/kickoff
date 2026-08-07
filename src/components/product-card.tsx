import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { formatLBP } from "@/lib/currency";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { productName } from "@/lib/i18n/product-name";
import type { ProductCategoryValue } from "@/lib/product-category";

export function ProductCard({
  product,
  index = 0,
  locale,
}: {
  product: {
    slug: string;
    name: string;
    nameAr?: string | null;
    category: ProductCategoryValue;
    basePrice: { toString(): string };
    salePrice?: { toString(): string } | null;
    variants?: { size: string | null; stock: number }[];
  };
  index?: number;
  locale: Locale;
}) {
  const dict = dictionaries[locale];
  const Icon = CATEGORY_ICONS[product.category];
  const sizes = [
    ...new Set(
      (product.variants ?? [])
        .filter((v) => v.size && v.stock > 0)
        .map((v) => v.size as string)
    ),
  ];
  const displayPrice = Number(product.salePrice ?? product.basePrice);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <Card className="h-full gap-0 py-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-1 hover:ring-accent/40">
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-accent/20 via-accent/5 to-brand/10">
          <Icon
            className="size-14 text-muted-foreground transition-transform duration-300 group-hover/card:scale-110"
            strokeWidth={1.25}
          />
        </div>
        <CardContent className="flex flex-col gap-1.5 pt-3 pb-4">
          <span className="w-fit rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium tracking-wide text-accent-foreground uppercase">
            {dict.categories[product.category]}
          </span>
          <p className="leading-snug font-medium">{productName(product, locale)}</p>
          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sizes.map((size) => (
                <span
                  key={size}
                  className="rounded border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {size}
                </span>
              ))}
            </div>
          )}
          {product.salePrice != null ? (
            <p className="mt-0.5 flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground line-through">
                ${product.basePrice.toString()}
              </span>
              <span className="text-lg font-semibold text-brand">
                ${product.salePrice.toString()}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-lg font-semibold text-brand">
              ${product.basePrice.toString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatLBP(displayPrice)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
