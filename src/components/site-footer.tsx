import Link from "next/link";
import { Logo } from "@/components/logo";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { PRODUCT_CATEGORIES } from "@/lib/product-category";

export async function SiteFooter() {
  const locale = await getLocale();
  const dict = dictionaries[locale];

  return (
    <footer className="border-t bg-surface-brand text-surface-brand-foreground">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-surface-brand-foreground/60">
            {dict.footer.tagline}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wide uppercase">
            {dict.footer.shop}
          </p>
          <nav className="flex flex-col gap-1.5">
            {PRODUCT_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/products?category=${category}`}
                className="w-fit text-sm text-surface-brand-foreground/60 transition-colors hover:text-accent"
              >
                {dict.categories[category]}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wide uppercase">
            {dict.footer.store}
          </p>
          <div className="flex flex-col gap-1.5 text-sm text-surface-brand-foreground/60">
            <p>{dict.footer.basedInLebanon}</p>
            <p>{dict.footer.onlineInStore}</p>
            <p>{dict.footer.payment}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-surface-brand-foreground/50">
          © {new Date().getFullYear()} Leader Sport. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
