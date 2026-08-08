import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { SOLD_ORDER_STATUSES } from "@/lib/order-status";
import { AGE_GROUPS, PRODUCT_CATEGORIES } from "@/lib/product-category";
import { adminProcedure, publicProcedure, router } from "@/server/trpc";

const variantInput = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  stock: z.number().int().nonnegative().default(0),
  barcode: z.string().optional(),
});

// Same shape as variantInput, but an existing `id` marks a row as an update
// to a current variant rather than a new one — used by product.update to
// diff submitted rows against what's already in the database.
const variantUpdateInput = variantInput.extend({
  id: z.string().optional(),
});

// costPrice is deliberately omitted from every query below except the two
// PIN-gated reveal procedures at the bottom of this router — it's never
// sent to the client (storefront or admin) until the PIN is verified.

export const productRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    ctx.prisma.product.findMany({
      where: { isActive: true },
      include: { variants: true },
      omit: { costPrice: true },
      orderBy: { createdAt: "desc" },
    })
  ),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.product.findUnique({
        where: { slug: input.slug },
        include: { variants: true },
        omit: { costPrice: true },
      })
    ),

  // Used by the admin "scan to sell" POS flow to look up a variant by its
  // scanned barcode.
  byBarcode: adminProcedure
    .input(z.object({ barcode: z.string().min(1) }))
    .query(({ ctx, input }) =>
      ctx.prisma.productVariant.findUnique({
        where: { barcode: input.barcode },
        include: { product: { omit: { costPrice: true } } },
      })
    ),

  // Used by the admin products table's "Sell" shortcut to deep-link a
  // single-variant product straight into a POS sale via ?variantId=.
  variantById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.productVariant.findUnique({
        where: { id: input.id },
        include: { product: { omit: { costPrice: true } } },
      })
    ),

  // Admin products table: every product (active + archived), with sold
  // units / revenue computed from paid-or-later order history.
  adminList: adminProcedure.query(async ({ ctx }) => {
    const products = await ctx.prisma.product.findMany({
      omit: { costPrice: true },
      include: {
        variants: {
          include: {
            orderItems: {
              where: { order: { status: { in: [...SOLD_ORDER_STATUSES] } } },
              select: { quantity: true, unitPrice: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return products.map(({ variants, ...product }) => {
      const orderItems = variants.flatMap((variant) => variant.orderItems);
      const sold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const revenue = orderItems.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0
      );
      return {
        ...product,
        variants: variants.map((variant) => ({
          id: variant.id,
          productId: variant.productId,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          barcode: variant.barcode,
          stock: variant.stock,
          priceOverride: variant.priceOverride,
          createdAt: variant.createdAt,
          updatedAt: variant.updatedAt,
        })),
        sold,
        revenue,
      };
    });
  }),

  byId: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.product.findUnique({
        where: { id: input.id },
        include: { variants: true },
        omit: { costPrice: true },
      })
    ),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.product.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
    ),

  // A real, permanent delete — not the isActive soft-delete above. Safe to
  // cascade even for a product that's already been sold: ProductVariant
  // cascades from Product, and OrderItem.variant is SET NULL (not
  // RESTRICT) on variant delete, so past orders survive with their
  // unitPrice/quantity intact, just losing the variant reference. Any
  // CartItem referencing a deleted variant cascades away too — a deleted
  // product shouldn't linger in someone's cart.
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.product.delete({ where: { id: input.id } })
    ),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        nameAr: z.string().optional(),
        slug: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(PRODUCT_CATEGORIES),
        ageGroup: z.enum(AGE_GROUPS).optional(),
        costPrice: z.number().nonnegative().optional(),
        basePrice: z.number().positive(),
        salePrice: z.number().positive().optional(),
        variants: z.array(variantUpdateInput).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, variants, ...productData } = input;

      const existing = await ctx.prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true },
      });
      const keptIds = new Set(
        variants.filter((variant) => variant.id).map((variant) => variant.id)
      );
      const removedIds = existing
        .map((variant) => variant.id)
        .filter((variantId) => !keptIds.has(variantId));

      try {
        return await ctx.prisma.$transaction(async (tx) => {
          if (removedIds.length > 0) {
            await tx.productVariant.deleteMany({
              where: { id: { in: removedIds } },
            });
          }

          for (const variant of variants) {
            const data = {
              size: variant.size || null,
              color: variant.color || null,
              stock: variant.stock,
              barcode: variant.barcode || null,
            };
            if (variant.id) {
              await tx.productVariant.update({ where: { id: variant.id }, data });
            } else {
              await tx.productVariant.create({
                data: {
                  ...data,
                  productId: id,
                  sku: `${input.slug.toUpperCase()}-${crypto
                    .randomUUID()
                    .slice(0, 6)
                    .toUpperCase()}`,
                },
              });
            }
          }

          return tx.product.update({
            where: { id },
            data: productData,
            include: { variants: true },
          });
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2003"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Can't remove a variant that already has order history — set its stock to 0 instead.",
          });
        }
        throw err;
      }
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        nameAr: z.string().optional(),
        slug: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(PRODUCT_CATEGORIES),
        ageGroup: z.enum(AGE_GROUPS).optional(),
        costPrice: z.number().nonnegative().optional(),
        basePrice: z.number().positive(),
        salePrice: z.number().positive().optional(),
        images: z.array(z.string()).default([]),
        variants: z.array(variantInput).default([]),
      })
    )
    .mutation(({ ctx, input }) => {
      const { variants, ...productData } = input;

      return ctx.prisma.product.create({
        data: {
          ...productData,
          variants: {
            create: variants.map((variant, index) => ({
              sku: `${input.slug.toUpperCase()}-${index + 1}-${crypto
                .randomUUID()
                .slice(0, 6)
                .toUpperCase()}`,
              size: variant.size || undefined,
              color: variant.color || undefined,
              stock: variant.stock,
              barcode: variant.barcode || undefined,
            })),
          },
        },
        include: { variants: true },
      });
    }),

  // PIN check happens here, not client-side — costPrice is never sent to
  // the browser until this returns successfully, so there's nothing to
  // "unhide" client-side for someone to find in devtools/network tab.
  revealCostPrice: adminProcedure
    .input(z.object({ pin: z.string(), id: z.string().optional() }))
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
      if (!input.id) return null;
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.id },
        select: { costPrice: true },
      });
      return product?.costPrice ?? null;
    }),

  // Admin products table's "Show costs" toggle — same PIN, all products at
  // once instead of one at a time.
  revealAllCostPrices: adminProcedure
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
      const products = await ctx.prisma.product.findMany({
        select: { id: true, costPrice: true },
      });
      return products;
    }),
});
