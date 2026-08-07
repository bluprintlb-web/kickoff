# Kick Off — WhatsApp order notifier

A small, always-on Node/Express service that sends the store owner a
WhatsApp message every time a real order is placed on Kick Off. It's
called **server-to-server** by the main Next.js app's `order.checkout`
procedure (see `src/lib/notify-order.ts` in the repo root) — there is no
public endpoint for browsers to call, no CORS, and nothing on the
storefront talks to this directly.

It uses [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys),
an **unofficial** WhatsApp Web protocol library — not something Meta
publishes or supports.

> ⚠️ **Read this before running it for real.** Baileys works by impersonating
> the real WhatsApp Web client. There's no approval process, but there's
> also no guarantee against a number getting flagged or banned for
> automated behavior. This service is built for exactly one low-volume,
> personal use case: notifying *yourself* about *your own* store's orders
> — roughly one message per order. Don't repurpose it to message customers,
> broadcast, or send at any real volume. Keep a fallback way to see new
> orders (the admin panel) in case this ever gets blocked.

## Why this needs its own always-on host (not Vercel, alongside the Next.js app)

Baileys holds a persistent WebSocket connection open to WhatsApp's servers
and needs to write its session credentials to disk so it doesn't ask for a
new QR-code login on every restart. Vercel's serverless functions are
short-lived and their filesystem is not reliably persistent across
invocations — both requirements break there. Railway/Render (regular
always-on containers with a real persistent disk) are the right fit, same
as a normal small backend service.

## Local development

```bash
cd whatsapp-notifier
npm install
cp .env.example .env
# edit .env: set OWNER_WHATSAPP_NUMBER and NOTIFY_SECRET (generate one with
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npm run dev
```

On first run, a QR code prints in the terminal. Open WhatsApp on your
phone → **Settings → Linked Devices → Link a Device** → scan it. Once
connected, the session is saved to `AUTH_DIR` (`./auth_info_baileys` by
default) and future restarts skip the QR step entirely — **do not commit
that folder**, it's already in `.gitignore` (it's effectively a login
token for your WhatsApp account).

Test the endpoint once connected:

```bash
curl -X POST http://localhost:3300/notify-order \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <your NOTIFY_SECRET>" \
  -d '{
    "orderId": "test123",
    "customerName": "Jane Doe",
    "customerPhone": "+96170123456",
    "items": [{ "name": "Home Kit Jersey", "size": "M", "quantity": 1, "unitPrice": 45 }],
    "total": 45,
    "address": { "line1": "123 Main St", "city": "Beirut", "country": "Lebanon" }
  }'
```

## Deploying to Railway (recommended — simpler persistent-disk story than Render's free tier)

1. **Push this repo to GitHub** if it isn't already (Railway deploys from a
   GitHub repo).
2. **Railway dashboard → New Project → Deploy from GitHub repo** → pick
   this repo.
3. Since this service lives in a subfolder of the main Kick Off repo, open
   the new service's **Settings → General → Root Directory** and set it to
   `whatsapp-notifier`. Railway auto-detects Node (Nixpacks) and runs
   `npm install` then `npm start` from there.
4. **Add a persistent Volume** (this is the step that makes the WhatsApp
   session survive redeploys): service → **Settings → Volumes → New
   Volume** → mount path `/data`.
5. **Settings → Variables** — add:
   - `OWNER_WHATSAPP_NUMBER` — your number, digits only (e.g. `96181962691`)
   - `NOTIFY_SECRET` — a long random string (same generator command as above)
   - `AUTH_DIR` — `/data/auth_info_baileys` (**must** be inside the mounted
     volume from step 4, or the session resets on every redeploy)
   - `BAILEYS_LOG_LEVEL` — `warn` (optional, that's already the default)
   - Leave `PORT` unset — Railway injects it automatically and the app
     already reads `process.env.PORT`.
6. **Deploy**, then open the **Deployments → Logs** tab and watch it boot.
   On first boot (no session yet) it prints a QR code as ASCII art directly
   in the log stream — scan it with WhatsApp within the display window
   (it auto-regenerates if it expires before you get to it). Once you see
   `[whatsapp] connected` in the logs, it's done — that session is now
   saved to the volume and survives future redeploys/restarts without
   asking again.
7. **Settings → Networking → Generate Domain** to get a public URL, e.g.
   `https://kickoff-whatsapp-notifier-production.up.railway.app`. The
   endpoint the main app calls is that URL + `/notify-order`.
8. Back in the **main Kick Off app's** own environment variables (wherever
   it's deployed — e.g. Vercel project settings), set:
   - `NOTIFY_ORDER_URL` = `https://<your-railway-domain>/notify-order`
   - `NOTIFY_ORDER_SECRET` = the exact same value as `NOTIFY_SECRET` above

That's it — place a real order on the storefront and you should get a
WhatsApp message within a couple of seconds.

## If you'd rather use Render instead

Works the same way, with one real caveat: Render's **free** Web Service
tier has no persistent disk (Render's "Disks" feature requires a paid
instance type) and free services spin down after ~15 minutes of
inactivity, which both work against what Baileys needs (a durable session
file and a stable long-lived connection). If you go this route, use a paid
instance type with a **Disk** attached, mount it (e.g. at `/data`), and set
`AUTH_DIR` to a path inside it — same idea as the Railway volume above.

## Troubleshooting

- **Asked for a new QR code after a redeploy** → `AUTH_DIR` isn't pointing
  inside your persistent volume/disk, so the session file didn't survive.
- **`/notify-order` returns 401** → `NOTIFY_SECRET` here and
  `NOTIFY_ORDER_SECRET` in the main app don't match exactly.
- **`/notify-order` returns 502** → the WhatsApp socket itself couldn't
  send (commonly: it's mid-reconnect, or the session was logged out from
  your phone — check the logs for `[whatsapp] session logged out`, which
  means you'll need to delete the volume's `auth_info_baileys` contents
  and re-scan a fresh QR code).
- **Order placed but no message, and no error in the main app** — the main
  app's call to this service is intentionally fire-and-forget (a WhatsApp
  outage should never fail a real checkout), so check *this* service's own
  logs, not the main app's.
