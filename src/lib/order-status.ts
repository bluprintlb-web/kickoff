// Which order statuses represent a real, counted sale — used by both the
// products table's sold/revenue columns and the admin orders/profit
// reporting, so "what counts as sold" can't drift between the two.
// Pending orders haven't been paid yet and cancelled ones never completed,
// so neither counts.
export const SOLD_ORDER_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;
