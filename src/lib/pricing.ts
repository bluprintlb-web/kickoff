// Single source of truth for "what do we actually charge for this variant."
// Precedence: a variant-level override always wins (e.g. a specific size
// priced differently), then the product's sale price if one is set, then
// the regular base price. Never touches costPrice — that's PIN-gated and
// has nothing to do with what a customer pays.
export type Money = { toString(): string } | number | null | undefined;

export function effectiveUnitPrice(variant: {
  priceOverride: Money;
  product: {
    salePrice: Money;
    basePrice: Money;
  };
}): number {
  if (variant.priceOverride != null) return Number(variant.priceOverride);
  if (variant.product.salePrice != null) return Number(variant.product.salePrice);
  return Number(variant.product.basePrice);
}
