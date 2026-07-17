import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./dictionaries";
import { LOCALE_COOKIE } from "./locale-cookie";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return (LOCALES as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : DEFAULT_LOCALE;
}
