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

## Admin push notifications (Web Push)

The admin panel can send a real browser/phone notification the instant a new
order comes in — even if no admin tab is open — using the Web Push API. No
external service, unlike the earlier WhatsApp-based approach (now dormant,
see `whatsapp-notifier/` and the `NOTIFY_ORDER_*` env vars — left in place,
not deleted, in case it's revisited).

### One-time setup

1. Generate a VAPID key pair (used to sign push messages so browsers' push
   services can verify they really came from this app):

   ```bash
   node -e "console.log(require('web-push').generateVAPIDKeys())"
   ```

2. Set these in your **main app's** deployment environment (wherever the
   Next.js app itself is hosted — e.g. Vercel project settings; **not**
   Railway, which is only for the separate, currently-dormant
   `whatsapp-notifier` service):

   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey from step 1>
   VAPID_PRIVATE_KEY=<privateKey from step 1>
   VAPID_SUBJECT=mailto:you@example.com
   ```

   All three are optional — checkout works fine without them, order push
   notifications just silently don't fire (see `src/lib/push-notify.ts`).

3. Redeploy (or restart `npm run dev` locally — env vars aren't hot-reloaded).

### Enabling it on a device

1. Log into `/admin` on the device you want notifications on.
2. Click **Enable order alerts** in the header. Your browser will prompt for
   notification permission — allow it.
3. That's it — place a real test order to confirm a notification appears.
   Click it to jump back into the admin panel.

To turn it off on that device, click the same button (now showing
**Notifications on**).

### Installing the admin panel as an app on your phone (recommended)

Installing gets you a real app icon and — critically for **iPhone** — is
**required** for push notifications to work at all: iOS Safari only
delivers Web Push to installed (Home Screen) PWAs, never to a regular
Safari tab, and needs iOS 16.4+.

**iPhone (Safari):**
1. Open `/admin` in Safari (must be Safari, not Chrome/Firefox on iOS).
2. Tap the Share icon → **Add to Home Screen** → **Add**.
3. Open the app from the Home Screen icon (not Safari) going forward, and
   enable notifications from inside it as described above.

**Android (Chrome):**
1. Open `/admin` in Chrome.
2. Tap the **Install app** button that appears in the admin header (or
   Chrome's own menu → **Install app**).
3. Notifications work the same whether installed or not on Android, but
   installing still gives a proper app icon/experience.

**Desktop (Chrome/Edge):** click the **Install app** button in the header,
or the install icon in the address bar.

## Notes

- This project runs on **Next.js 16**, which renamed `middleware.ts` to `proxy.ts` and made several other breaking changes from earlier versions — check `node_modules/next/dist/docs` (or nextjs.org/docs) before assuming an older pattern still applies.
- Authorization follows Next.js's recommended two-layer pattern: `proxy.ts` does a cheap, optimistic cookie check to redirect obviously unauthenticated/non-admin requests away from `/admin`; the real check happens in `src/lib/dal.ts`'s `requireAdmin()`, called from the admin layout and any Server Action/Route Handler/tRPC procedure that touches sensitive data.
