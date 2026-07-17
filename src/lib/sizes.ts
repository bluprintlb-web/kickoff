// Jerseys use one of two size ladders, chosen via Product.ageGroup. Gloves
// use their own fixed numeric ladder (not tied to ageGroup — gloves aren't
// split by kids/mens in this store). Everything else (balls, trophies,
// bodywear, shin pads, socks) doesn't use a fixed ladder — ProductVariant.size
// stays free text for those.

export const KIDS_SIZES = ["20", "22", "24", "26", "28", "30"] as const;

export const MENS_SIZES = ["S", "M", "L", "XL", "XXL"] as const; // XXL = 2XL

export const GLOVE_SIZES = ["4", "5", "6", "7", "8", "9", "10", "11"] as const;

export type KidsSize = (typeof KIDS_SIZES)[number];
export type MensSize = (typeof MENS_SIZES)[number];
export type GloveSize = (typeof GLOVE_SIZES)[number];

export function sizesForAgeGroup(
  ageGroup: "KIDS" | "ADULT" | null | undefined
): readonly string[] {
  if (ageGroup === "KIDS") return KIDS_SIZES;
  if (ageGroup === "ADULT") return MENS_SIZES;
  return [];
}
