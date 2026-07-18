import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = dictionaries[locale];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="bg-secondary px-4 py-2 text-center text-xs font-medium tracking-wide text-secondary-foreground dark:bg-[color-mix(in_oklch,#fefae0,black_10%)] dark:text-[#212529]">
        {dict.promoBar}
      </div>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
