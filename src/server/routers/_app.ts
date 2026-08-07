import { router } from "@/server/trpc";
import { cartRouter } from "@/server/routers/cart";
import { orderRouter } from "@/server/routers/order";
import { productRouter } from "@/server/routers/product";
import { pushSubscriptionRouter } from "@/server/routers/push-subscription";
import { userRouter } from "@/server/routers/user";

export const appRouter = router({
  product: productRouter,
  order: orderRouter,
  cart: cartRouter,
  user: userRouter,
  pushSubscription: pushSubscriptionRouter,
});

export type AppRouter = typeof appRouter;
