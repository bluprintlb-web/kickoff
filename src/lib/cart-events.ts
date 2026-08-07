// A plain DOM CustomEvent, not a state library — the only two places involved
// are AddToCart (dispatches, on the product page) and CartMenu (listens, in
// the header), which don't otherwise share a React tree, and the payload is
// just "something happened," nothing to pass along.
export const CART_ITEM_ADDED_EVENT = "kickoff:cart-item-added";

export function dispatchCartItemAdded() {
  window.dispatchEvent(new Event(CART_ITEM_ADDED_EVENT));
}
