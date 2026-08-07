import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { Locale } from "@/lib/i18n/dictionaries";

export interface PhoneCountry {
  iso2: string;
  name: string;
  dialCode: string;
}

// Country names and calling codes both come from verified sources (Intl's
// own locale data and libphonenumber-js's maintained metadata) rather than
// typed from memory, so this list is accurate for all ~200 countries and
// automatically localized to Arabic — not just Lebanon hardcoded. (Real SVG
// flag icons — not emoji, since Windows/Chrome render regional-indicator
// emoji as plain two-letter text rather than a colored flag — are looked up
// separately by iso2 in firebase-auth-buttons.tsx via country-flag-icons.)
export function getPhoneCountries(locale: Locale): PhoneCountry[] {
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });

  return getCountries()
    .map((iso2) => ({
      iso2,
      name: regionNames.of(iso2) ?? iso2,
      dialCode: getCountryCallingCode(iso2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

// The store is based in Lebanon, so it's the sensible default rather than
// making every customer scroll/search a ~200-country list.
export const DEFAULT_PHONE_COUNTRY_ISO2 = "LB";
