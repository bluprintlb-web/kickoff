import { MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { PRODUCT_CATEGORIES } from "@/lib/product-category";
import { trpcCaller } from "@/trpc/server";

export default async function HomePage() {
  const [trpc, locale] = await Promise.all([trpcCaller(), getLocale()]);
  const products = await trpc.product.list();
  const dict = dictionaries[locale];

  const TRUST_ITEMS = [
    {
      icon: MapPin,
      title: dict.trustStrip.basedTitle,
      description: dict.trustStrip.basedDesc,
    },
    {
      icon: ShieldCheck,
      title: dict.trustStrip.secureTitle,
      description: dict.trustStrip.secureDesc,
    },
  ];

  return (
    <div className="flex w-full flex-1 flex-col">
      <section className="relative overflow-hidden border-b bg-surface-brand text-surface-brand-foreground">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--accent),transparent_80%),transparent_60%)]"
        />
        <div className="animate-in fade-in slide-in-from-bottom-4 relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-24 duration-700 sm:py-28">
          <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-accent uppercase">
            {dict.hero.badge}
          </span>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            KICK <span className="text-accent">OFF</span>
          </h1>
          <p className="max-w-xl text-lg text-surface-brand-foreground/70">
            {dict.hero.tagline}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/products">
              <Button
                variant="accent"
                size="lg"
                className="transition-transform hover:scale-105"
              >
                {dict.hero.shopAll}
              </Button>
            </Link>
            <Link href="#categories">
              <Button
                variant="outline"
                size="lg"
                className="border-surface-brand-foreground/25 bg-transparent text-surface-brand-foreground transition-transform hover:scale-105 hover:bg-white/10 hover:text-surface-brand-foreground"
              >
                {dict.hero.browseCategories}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b bg-gradient-to-r from-accent/10 via-brand/5 to-accent/10">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-2">
          {TRUST_ITEMS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col gap-5 px-4 py-16 sm:py-20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {dict.categoriesSection.heading}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dict.categoriesSection.subheading}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRODUCT_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            return (
              <Link
                key={category}
                href={`/products?category=${category}`}
                className="group flex flex-col items-center gap-3 rounded-xl border bg-gradient-to-br from-accent/10 to-brand/5 px-4 py-7 text-center transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg"
              >
                <div className="flex size-12 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground transition-all duration-200 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="size-6" />
                </div>
                <span className="text-sm font-medium">
                  {dict.categories[category]}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex-1 bg-gradient-to-b from-brand/5 via-transparent to-transparent">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-16 sm:py-20">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {dict.latestProducts.heading}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dict.latestProducts.subheading}
            </p>
          </div>
          {products.length === 0 ? (
            <p className="text-muted-foreground">{dict.latestProducts.empty}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {products.map((product, index) => (
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
      </section>
    </div>
  );
}
