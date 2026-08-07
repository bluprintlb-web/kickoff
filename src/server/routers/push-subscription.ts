import { z } from "zod";
import { adminProcedure, router } from "@/server/trpc";

export const pushSubscriptionRouter = router({
  // Admin-only: these are for the admin panel's own order alerts, not a
  // general customer-facing notification system.
  subscribe: adminProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string().min(1),
          auth: z.string().min(1),
        }),
      })
    )
    .mutation(({ ctx, input }) =>
      // Upsert on endpoint (unique) — re-subscribing the same browser
      // (e.g. after a permission re-grant) updates the keys in place
      // instead of erroring or creating a duplicate row.
      ctx.prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
          userId: ctx.session.user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
        update: {
          userId: ctx.session.user.id,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
      })
    ),

  unsubscribe: adminProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.pushSubscription
        .delete({ where: { endpoint: input.endpoint } })
        .catch(() => {
          // Already gone (e.g. cleaned up server-side after a 410) — not
          // an error from the caller's point of view.
        })
    ),

  // Lets the button show "already enabled on this device" correctly on
  // load, without the browser's own Notification.permission alone being
  // enough (permission can be "granted" while the subscription itself was
  // deleted server-side, e.g. after a 410).
  isSubscribed: adminProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .query(({ ctx, input }) =>
      ctx.prisma.pushSubscription
        .findUnique({ where: { endpoint: input.endpoint } })
        .then((sub) => sub !== null)
    ),
});
