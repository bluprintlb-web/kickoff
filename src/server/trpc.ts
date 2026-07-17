import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function createTRPCContext(opts: { headers: Headers }) {
  const session = await auth();
  return {
    session,
    prisma,
    headers: opts.headers,
  };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(enforceAuthed);

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const adminProcedure = t.procedure.use(enforceAdmin);
