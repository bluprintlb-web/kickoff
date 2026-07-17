import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { protectedProcedure, router } from "@/server/trpc";

async function requirePasswordMatch(
  prisma: PrismaClient,
  userId: string,
  currentPassword: string
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This account has no password set.",
    });
  }
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Current password is incorrect.",
    });
  }
  return user;
}

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { id: true, name: true, email: true },
    })
  ),

  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(100) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name },
        select: { id: true, name: true, email: true },
      })
    ),

  updateEmail: protectedProcedure
    .input(
      z.object({
        newEmail: z.email(),
        currentPassword: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requirePasswordMatch(
        ctx.prisma,
        ctx.session.user.id,
        input.currentPassword
      );
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.newEmail },
      });
      if (existing && existing.id !== user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { email: input.newEmail },
      });
      return { ok: true };
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requirePasswordMatch(
        ctx.prisma,
        ctx.session.user.id,
        input.currentPassword
      );
      const hashed = await bcrypt.hash(input.newPassword, 10);
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
      return { ok: true };
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ currentPassword: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await requirePasswordMatch(
        ctx.prisma,
        ctx.session.user.id,
        input.currentPassword
      );
      await ctx.prisma.user.delete({ where: { id: user.id } });
      return { ok: true };
    }),
});
