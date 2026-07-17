import type { Locale } from "./dictionaries";

// Products only have one Arabic field worth translating today (the name —
// description entry was deliberately removed from the admin form). Falls
// back to the English name whenever nameAr hasn't been set for a product.
export function productName(
  product: { name: string; nameAr?: string | null },
  locale: Locale
) {
  return locale === "ar" && product.nameAr ? product.nameAr : product.name;
}
