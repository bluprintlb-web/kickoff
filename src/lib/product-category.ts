export const PRODUCT_CATEGORIES = [
  "JERSEY",
  "TROPHY",
  "BALL",
  "GLOVES",
  "BODYWEAR",
  "SHIN_PADS",
  "SOCKS",
] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ProductCategoryValue, string> = {
  JERSEY: "Jerseys",
  TROPHY: "Trophies",
  BALL: "Balls",
  GLOVES: "Gloves",
  BODYWEAR: "Bodywear",
  SHIN_PADS: "Shin pads",
  SOCKS: "Socks",
};

export const AGE_GROUPS = ["KIDS", "ADULT"] as const;
export type AgeGroupValue = (typeof AGE_GROUPS)[number];
