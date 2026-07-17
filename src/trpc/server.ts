import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/server/trpc";

const createContext = cache(async () => createTRPCContext({ headers: await headers() }));

export async function trpcCaller() {
  return appRouter.createCaller(await createContext());
}
