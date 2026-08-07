# Kick Off

Football store — storefront (kits/jerseys, trophies, balls, gloves, body/leggings, shin pads, grip socks, normal socks) plus an admin dashboard for managing products, stock, and orders.

See `CONTEXT_HANDOFF.md` for the current project state, decisions made, and open questions.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- tRPC + TanStack Query
- PostgreSQL + Prisma
- Auth.js (credentials login, role-based access — `CUSTOMER` / `ADMIN`)
- Stripe (payments), Cloudinary (product images)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in a real `DATABASE_URL` (see `.env` for a dev-only `AUTH_SECRET` already set). Stripe/Cloudinary keys can stay blank until those integrations are wired up.

3. Push the Prisma schema to your database:

   ```bash
   npx prisma migrate dev --name init
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

To make a user an admin, set their `role` to `ADMIN` directly in the database (e.g. via `npx prisma studio`) after they've signed up at `/register`.

## Project structure

```
src/
  app/                    storefront + admin routes (App Router)
    admin/                admin dashboard, gated by requireAdmin() in layout.tsx
    products/             storefront product listing + detail pages
    login/, register/     credentials auth pages
    actions/auth.ts       Server Actions for signup/login/logout
    api/auth/[...nextauth] Auth.js route handler
    api/trpc/[trpc]        tRPC route handler
  auth.ts                 Auth.js config (Credentials provider, Prisma adapter, JWT sessions)
  proxy.ts                optimistic /admin route protection (Next.js 16 renamed middleware -> proxy)
  lib/
    prisma.ts             Prisma client singleton
    dal.ts                verifySession() / requireAdmin() — the real authorization checks
  server/
    trpc.ts               tRPC init, public/protected/admin procedures
    routers/               tRPC routers (product, ...)
  trpc/                   tRPC + React Query client wiring (react.tsx, server.ts, query-client.ts)
prisma/
  schema.prisma           User/Account/Session (Auth.js) + Product/ProductVariant/Cart/Order models
```

## Notes

- This project runs on **Next.js 16**, which renamed `middleware.ts` to `proxy.ts` and made several other breaking changes from earlier versions — check `node_modules/next/dist/docs` (or nextjs.org/docs) before assuming an older pattern still applies.
- Authorization follows Next.js's recommended two-layer pattern: `proxy.ts` does a cheap, optimistic cookie check to redirect obviously unauthenticated/non-admin requests away from `/admin`; the real check happens in `src/lib/dal.ts`'s `requireAdmin()`, called from the admin layout and any Server Action/Route Handler/tRPC procedure that touches sensitive data.
