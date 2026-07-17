// Fixed approximate rate — Lebanon has no single stable official USD/LBP
// rate, so this is a display-only placeholder, not a real-time quote.
// Replace with a live/frequently-updated source before real launch (see
// CONTEXT_HANDOFF.md's Next Steps) — prices are still charged/settled in
// USD everywhere; this never affects what's actually billed.
export const LBP_PER_USD = 89_500;

export function formatLBP(usd: number): string {
  const lbp = Math.round(usd * LBP_PER_USD);
  return `${new Intl.NumberFormat("en-US").format(lbp)} LBP`;
}
