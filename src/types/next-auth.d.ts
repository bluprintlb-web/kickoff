import type { Role } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

// next-auth/jwt re-exports JWT via `export *`, which TypeScript doesn't
// reliably merge for module augmentation — augment the origin module instead.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
