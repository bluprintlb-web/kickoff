import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { AccountMenu } from "@/components/account-menu";
import { CartMenu } from "@/components/cart-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { SocialLinks } from "@/components/social-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import {
  PRODUCT_CATEGORIES,
  type ProductCategoryValue,
} from "@/lib/product-category";
import { trpcCaller } from "@/trpc/server";

type MenuNode = {
  href: string;
  label: string;
  children?: MenuNode[];
};

const dropdownRowClass =
  "flex items-center justify-between gap-3 px-3 py-2 text-xs font-normal tracking-normal whitespace-nowrap uppercase transition-colors hover:bg-slate-100 hover:text-slate-900";

function DropdownRow({ node }: { node: MenuNode }) {
  if (!node.children?.length) {
    return (
      <Link href={node.href} className={dropdownRowClass}>
        {node.label}
      </Link>
    );
  }

  return (
    <div className="group/item relative">
      <Link href={node.href} className={dropdownRowClass}>
        {node.label}
        <ChevronRight className="size-3 shrink-0 opacity-50 rtl:rotate-180" />
      </Link>
      <div className="invisible absolute top-0 start-full z-30 w-44 rounded-md border border-black/10 bg-white py-1 text-slate-700 opacity-0 shadow-lg transition-all duration-150 group-hover/item:visible group-hover/item:opacity-100">
        {node.children.map((child) => (
          <DropdownRow key={child.href} node={child} />
        ))}
      </div>
    </div>
  );
}

function CategoryDropdown({
  category,
  label,
  items,
}: {
  category: ProductCategoryValue;
  label: string;
  items: MenuNode[];
}) {
  return (
    <div className="group relative">
      <Link
        href={`/products?category=${category}`}
        className="hover-underline transition-colors hover:text-accent"
      >
        {label}
      </Link>
      <div className="invisible absolute top-full start-0 z-20 w-48 rounded-md border border-black/10 bg-white py-1 text-slate-700 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
        {items.map((item) => (
          <DropdownRow key={item.href} node={item} />
        ))}
      </div>
    </div>
  );
}

export async function SiteHeader() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  const dict = dictionaries[locale];

  let cartCount = 0;
  if (session?.user) {
    const trpc = await trpcCaller();
    const cart = await trpc.cart.get();
    cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-surface-brand text-surface-brand-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <AccountMenu
            locale={locale}
            isLoggedIn={!!session?.user}
            isAdmin={session?.user?.role === "ADMIN"}
          />
          <Link href="/" className="text-surface-brand-foreground">
            <Logo />
          </Link>
        </div>
        <nav className="flex items-center gap-4 text-sm text-surface-brand-foreground/75">
          <Link
            href="/products"
            className="hover-underline transition-colors hover:text-accent"
          >
            {dict.nav.shop}
          </Link>
          <CartMenu
            initialCount={cartCount}
            locale={locale}
            isLoggedIn={!!session?.user}
          />
          <SocialLinks
            variant="circle"
            label={dict.footer.followUs}
            className="text-surface-brand-foreground/75"
          />
          <LanguageToggle
            locale={locale}
            className="border-white/15 bg-white/5 text-surface-brand-foreground"
          />
          <ThemeToggle
            labels={dict.themeToggle}
            locale={locale}
            className="border-white/15 bg-white/5 text-surface-brand-foreground"
          />
          {!session?.user && (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-surface-brand-foreground/75 hover:bg-white/10 hover:text-surface-brand-foreground"
                >
                  {dict.nav.logIn}
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white bg-white text-black hover:bg-white/90"
                >
                  {dict.auth.signUp}
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="border-t border-white/10 bg-[color-mix(in_oklch,var(--surface-brand),black_15%)]">
        <nav className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2 text-xs font-medium tracking-wide whitespace-nowrap text-surface-brand-foreground/65 uppercase sm:overflow-visible">
          {PRODUCT_CATEGORIES.map((category) => {
            if (category === "JERSEY") {
              return (
                <CategoryDropdown
                  key={category}
                  category={category}
                  label={dict.categories[category]}
                  items={[
                    {
                      href: `/products?category=${category}&type=fan`,
                      label: dict.jerseyMenu.fan,
                    },
                    {
                      href: `/products?category=${category}&type=player`,
                      label: dict.jerseyMenu.player,
                    },
                  ]}
                />
              );
            }
            if (category === "TROPHY") {
              return (
                <CategoryDropdown
                  key={category}
                  category={category}
                  label={dict.categories[category]}
                  items={[
                    {
                      href: `/products?category=${category}&type=world-cup`,
                      label: dict.trophyMenu.worldCup,
                    },
                    {
                      href: `/products?category=${category}&type=champions-league`,
                      label: dict.trophyMenu.championsLeague,
                    },
                    {
                      href: `/products?category=${category}&type=small`,
                      label: dict.trophyMenu.small,
                    },
                  ]}
                />
              );
            }
            if (category === "GLOVES") {
              const boneChildren = (size: string) => [
                {
                  href: `/products?category=${category}&size=${size}&type=with-bones`,
                  label: dict.glovesMenu.withBones,
                },
                {
                  href: `/products?category=${category}&size=${size}&type=without-bones`,
                  label: dict.glovesMenu.withoutBones,
                },
              ];
              return (
                <CategoryDropdown
                  key={category}
                  category={category}
                  label={dict.categories[category]}
                  items={[
                    {
                      href: `/products?category=${category}&size=kids`,
                      label: dict.glovesMenu.kids,
                      children: boneChildren("kids"),
                    },
                    {
                      href: `/products?category=${category}&size=mens`,
                      label: dict.glovesMenu.mens,
                      children: boneChildren("mens"),
                    },
                  ]}
                />
              );
            }
            if (category === "SHIN_PADS") {
              return (
                <CategoryDropdown
                  key={category}
                  category={category}
                  label={dict.categories[category]}
                  items={[
                    {
                      href: `/products?category=${category}&type=big`,
                      label: dict.shinPadsMenu.big,
                    },
                    {
                      href: `/products?category=${category}&type=small`,
                      label: dict.shinPadsMenu.small,
                    },
                  ]}
                />
              );
            }
            if (category === "SOCKS") {
              const typeChildren = (length: string) => [
                {
                  href: `/products?category=${category}&length=${length}&type=grip`,
                  label: dict.socksMenu.grip,
                },
                {
                  href: `/products?category=${category}&length=${length}&type=normal`,
                  label: dict.socksMenu.normal,
                },
              ];
              return (
                <CategoryDropdown
                  key={category}
                  category={category}
                  label={dict.categories[category]}
                  items={[
                    {
                      href: `/products?category=${category}&length=tall`,
                      label: dict.socksMenu.tall,
                      children: typeChildren("tall"),
                    },
                    {
                      href: `/products?category=${category}&length=short`,
                      label: dict.socksMenu.short,
                      children: typeChildren("short"),
                    },
                  ]}
                />
              );
            }
            return (
              <Link
                key={category}
                href={`/products?category=${category}`}
                className="hover-underline transition-colors hover:text-accent"
              >
                {dict.categories[category]}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
