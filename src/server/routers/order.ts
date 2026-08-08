import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getPaymentProvider } from "@/lib/payments";
import { notifyAdminsOfOrder } from "@/lib/push-notify";
import { effectiveUnitPrice } from "@/lib/pricing";
import { SOLD_ORDER_STATUSES } from "@/lib/order-status";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";

const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const orderRouter = router({
  // Admin "scan to sell" POS flow — completes an in-person sale immediately
  // (no shipping, no cart), decrements stock, and records how it was paid.
  createPosSale: adminProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              variantId: z.string(),
              quantity: z.number().int().positive(),
            })
          )
          .min(1),
        paymentMethod: z.enum(["CASH", "WHISH", "CARD"]),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
          where: { id: { in: input.items.map((item) => item.variantId) } },
          include: { product: true },
        });
        const variantById = new Map(variants.map((v) => [v.id, v]));

        let total = 0;
        const orderItemsData = input.items.map((item) => {
          const variant = variantById.get(item.variantId);
          if (!variant) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "One of the scanned items no longer exists.",
            });
          }
          if (variant.stock < item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Not enough stock for ${variant.product.name}${
                variant.size ? ` (${variant.size})` : ""
              }.`,
            });
          }
          const unitPrice = effectiveUnitPrice(variant);
          total += unitPrice * item.quantity;
          return {
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice,
            costPriceAtOrder: variant.product.costPrice,
          };
        });

        for (const item of input.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        return tx.order.create({
          data: {
            channel: "IN_STORE",
            status: "PAID",
            paymentMethod: input.paymentMethod,
            total,
            items: { create: orderItemsData },
          },
          include: { items: true },
        });
      })
    ),

  // Storefront checkout: turns the customer's cart into an ONLINE order,
  // decrements stock, then hands off to the payment provider for a hosted
  // checkout URL. Rolls the order back if the provider call fails, since
  // Whish isn't fully wired up yet (see src/lib/payments/whish.ts).
  checkout: protectedProcedure
    .input(
      z.object({
        paymentMethod: z.enum(["WHISH", "CARD", "CASH"]),
        shippingName: z.string().min(1),
        shippingAddress: z.string().min(1),
        shippingCity: z.string().min(1),
        shippingPostalCode: z.string().min(1),
        shippingCountry: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.prisma.cart.findUnique({
        where: { userId: ctx.session.user.id },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });

      if (!cart || cart.items.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Your cart is empty." });
      }

      const order = await ctx.prisma.$transaction(async (tx) => {
        let total = 0;
        const itemsData = cart.items.map((item) => {
          if (item.variant.stock < item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Not enough stock for ${item.variant.product.name}.`,
            });
          }
          const unitPrice = effectiveUnitPrice(item.variant);
          total += unitPrice * item.quantity;
          return {
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice,
            costPriceAtOrder: item.variant.product.costPrice,
          };
        });

        for (const item of cart.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        const createdOrder = await tx.order.create({
          data: {
            userId: ctx.session.user.id,
            channel: "ONLINE",
            status: "PENDING",
            paymentMethod: input.paymentMethod,
            total,
            shippingName: input.shippingName,
            shippingAddress: input.shippingAddress,
            shippingCity: input.shippingCity,
            shippingPostalCode: input.shippingPostalCode,
            shippingCountry: input.shippingCountry,
            items: { create: itemsData },
          },
        });

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return createdOrder;
      });

      notifyAdminsOfOrder({
        orderId: order.id,
        customerName: input.shippingName,
        total: Number(order.total),
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      // Cash on delivery never touches a payment provider — nothing to
      // redirect to, nothing that can fail mid-call, and no reference to
      // record. The order is left PENDING (its default) exactly like a
      // just-placed WHISH/CARD order is before its payment clears; it's
      // marked paid once cash is actually collected at delivery, same as
      // any other pending order.
      if (input.paymentMethod === "CASH") {
        return {
          redirectUrl: `${appUrl}/orders/${order.id}`,
          orderId: order.id,
        };
      }

      try {
        const provider = getPaymentProvider(input.paymentMethod);
        const checkout = await provider.createCheckout({
          orderId: order.id,
          amount: Number(order.total),
          currency: "USD",
          customerName: input.shippingName,
          customerEmail: ctx.session.user.email ?? undefined,
          returnUrl: `${appUrl}/orders/${order.id}`,
        });

        await ctx.prisma.order.update({
          where: { id: order.id },
          data: { paymentReference: checkout.providerReference },
        });

        return { redirectUrl: checkout.redirectUrl, orderId: order.id };
      } catch (error) {
        // Payment couldn't be started — restore stock and cancel the order
        // rather than leaving a phantom PENDING order with reserved stock.
        await ctx.prisma.$transaction(async (tx) => {
          const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
          for (const item of items) {
            // variantId is nullable at the schema level (a variant can be
            // hard-deleted later, see the model comment on OrderItem), but
            // in practice can't be null here — this order and its items
            // were just created moments ago in this same request. Skip
            // defensively rather than assert non-null: nothing to restore
            // stock to if the variant is somehow already gone.
            if (!item.variantId) continue;
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
          await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Payment could not be started.",
        });
      }
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: {
          items: {
            // costPriceAtOrder never leaves the server for this
            // customer-facing procedure — same rule as Product.costPrice.
            omit: { costPriceAtOrder: true },
            include: {
              variant: { include: { product: { omit: { costPrice: true } } } },
            },
          },
        },
      });

      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return order;
    }),

  // Admin orders page: every order, newest first, with just enough to show
  // in a list (no cost/profit data here — that's the PIN-gated procedures
  // below).
  adminList: adminProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { quantity: true } },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      channel: order.channel,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
      customerName: order.user?.name ?? order.shippingName ?? null,
      customerEmail: order.user?.email ?? null,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }));
  }),

  // Admin-only status change (e.g. marking an ONLINE order shipped/
  // delivered, or cancelling one). Deliberately doesn't touch stock either
  // way — that's a separate concern with its own edge cases (partial
  // fulfillment, restocking damaged returns, ...) that nobody's asked for
  // yet; the checkout failure path already handles the one stock-restore
  // case that matters today (a payment that never completed).
  updateStatus: adminProcedure
    .input(z.object({ id: z.string(), status: z.enum(ORDER_STATUSES) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.order.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    ),

  // Revenue + order count per calendar month, from the first counted sale
  // through the current month (gap months included as zero, so trends are
  // visible). No PIN — revenue alone isn't gated anywhere else in this app
  // either (see product.adminList's Revenue column). Cost/profit is a
  // separate PIN-gated procedure below, same split as
  // product.adminList/revealAllCostPrices.
  monthlyStats: adminProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      where: { status: { in: [...SOLD_ORDER_STATUSES] } },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        items: { select: { quantity: true, unitPrice: true } },
      },
    });

    if (orders.length === 0) return [];

    const months = buildMonthBuckets(orders[0].createdAt);
    for (const order of orders) {
      const bucket = months.get(monthKey(order.createdAt));
      if (!bucket) continue;
      bucket.orderCount += 1;
      for (const item of order.items) {
        bucket.revenue += Number(item.unitPrice) * item.quantity;
      }
    }

    return [...months.values()];
  }),

  // Same monthly buckets as monthlyStats, but cost (and therefore profit)
  // — PIN-gated like Product.costPrice, since profit is directly derived
  // from cost. Falls back to the product's *current* costPrice for order
  // items placed before costPriceAtOrder existed (see the schema comment)
  // — a best-effort estimate for old months, not exact history.
  revealMonthlyCosts: adminProcedure
    .input(z.object({ pin: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!process.env.COST_PRICE_PIN) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "COST_PRICE_PIN isn't set in the environment.",
        });
      }
      if (input.pin !== process.env.COST_PRICE_PIN) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect PIN." });
      }

      const orders = await ctx.prisma.order.findMany({
        where: { status: { in: [...SOLD_ORDER_STATUSES] } },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          items: {
            select: {
              quantity: true,
              costPriceAtOrder: true,
              variant: { select: { product: { select: { costPrice: true } } } },
            },
          },
        },
      });

      if (orders.length === 0) return [];

      const months = new Map<string, { month: string; cost: number }>();
      for (const order of orders) {
        const key = monthKey(order.createdAt);
        if (!months.has(key)) months.set(key, { month: key, cost: 0 });
        const bucket = months.get(key)!;
        for (const item of order.items) {
          const cost = item.costPriceAtOrder ?? item.variant?.product.costPrice;
          if (cost == null) continue;
          bucket.cost += Number(cost) * item.quantity;
        }
      }

      return [...months.values()];
    }),
});

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Every calendar month from the given start date through the current
// month, so a chart/table can show a continuous timeline (including
// zero-order months) instead of only the months something happened to sell.
function buildMonthBuckets(start: Date) {
  const months = new Map<
    string,
    { month: string; revenue: number; orderCount: number }
  >();
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  while (cursor <= end) {
    months.set(monthKey(cursor), {
      month: monthKey(cursor),
      revenue: 0,
      orderCount: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}
