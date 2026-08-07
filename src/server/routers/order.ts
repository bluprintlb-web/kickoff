import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwnerOfOrder } from "@/lib/notify-order";
import { getPaymentProvider } from "@/lib/payments";
import { effectiveUnitPrice } from "@/lib/pricing";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";

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
          return { variantId: item.variantId, quantity: item.quantity, unitPrice };
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
          return { variantId: item.variantId, quantity: item.quantity, unitPrice };
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

      const customer = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { phone: true },
      });
      notifyOwnerOfOrder({
        orderId: order.id,
        customerName: input.shippingName,
        customerPhone: customer?.phone,
        items: cart.items.map((item) => ({
          name: item.variant.product.name,
          size: item.variant.size,
          quantity: item.quantity,
          unitPrice: effectiveUnitPrice(item.variant),
        })),
        total: Number(order.total),
        address: {
          line1: input.shippingAddress,
          city: input.shippingCity,
          postalCode: input.shippingPostalCode,
          country: input.shippingCountry,
        },
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
});
