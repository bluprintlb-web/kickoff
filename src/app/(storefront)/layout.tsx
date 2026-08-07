import { CampaignBanner } from "@/components/campaign-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/i18n/get-locale";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <div
      id="storefront-root"
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="flex min-h-full flex-1 flex-col"
    >
      <CampaignBanner locale={locale} />
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
