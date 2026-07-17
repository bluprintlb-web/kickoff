import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { QUIET_RELOAD_COOKIE } from "@/lib/quiet-reload-cookie";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Keeps the loading.tsx splash on screen a bit longer on first load —
  // requested so the branded splash doesn't just flash by. Skipped for
  // quiet reloads (e.g. the language toggle), which should feel instant.
  const cookieStore = await cookies();
  if (!cookieStore.get(QUIET_RELOAD_COOKIE)) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

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
