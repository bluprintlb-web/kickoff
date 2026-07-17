import { z } from "zod";
import { protectedProcedure, router } from "@/server/trpc";

export const cartRouter = router({
  get: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.cart.upsert({
      where: { userId: ctx.session.user.id },
      create: { userId: ctx.session.user.id },
      update: {},
      include: {
        items: {
          include: {
            variant: { include: { product: { omit: { costPrice: true } } } },
          },
        },
      },
    })
  ),

  addItem: protectedProcedure
    .input(
      z.object({
        variantId: z.string(),
        quantity: z.number().int().positive().default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.prisma.cart.upsert({
        where: { userId: ctx.session.user.id },
        create: { userId: ctx.session.user.id },
        update: {},
      });

      return ctx.prisma.cartItem.upsert({
        where: {
          cartId_variantId: { cartId: cart.id, variantId: input.variantId },
        },
        create: {
          cartId: cart.id,
          variantId: input.variantId,
          quantity: input.quantity,
        },
        update: { quantity: { increment: input.quantity } },
      });
    }),

  updateItem: protectedProcedure
    .input(z.object({ variantId: z.string(), quantity: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.prisma.cart.findUnique({
        where: { userId: ctx.session.user.id },
      });
      if (!cart) return null;

      if (input.quantity === 0) {
        return ctx.prisma.cartItem.deleteMany({
          where: { cartId: cart.id, variantId: input.variantId },
        });
      }

      return ctx.prisma.cartItem.update({
        where: {
          cartId_variantId: { cartId: cart.id, variantId: input.variantId },
        },
        data: { quantity: input.quantity },
      });
    }),
});
