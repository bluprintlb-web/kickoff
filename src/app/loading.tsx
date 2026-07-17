import { cookies } from "next/headers";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { QUIET_RELOAD_COOKIE } from "@/lib/quiet-reload-cookie";

export default async function Loading() {
  // Quiet reloads (e.g. the language toggle) skip the branded splash
  // entirely, not just the artificial hold in (storefront)/layout.tsx —
  // otherwise it still flashes briefly even with the hold skipped.
  const cookieStore = await cookies();
  if (cookieStore.get(QUIET_RELOAD_COOKIE)) return null;

  const locale = await getLocale();
  const dict = dictionaries[locale];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
        <img
          src="/logo-mark.png"
          alt="Leader Sport"
          className="w-[clamp(140px,16vw,220px)]"
        />
        <p className="relative mt-5 text-3xl font-bold tracking-[0.2em] text-slate-100 sm:text-4xl">
          LEADER SPORT
        </p>
        <p className="relative mt-1 text-[11px] tracking-[0.25em] text-slate-500 uppercase">
          {dict.hero.badge}
        </p>
        <div className="relative mt-7 flex gap-2">
          <span className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-slate-500" />
        </div>
      </div>
    </div>
  );
}
