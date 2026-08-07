// Baileys connection manager: logs in once via a WhatsApp pairing code
// (not a QR code — Railway's web log viewer distorts ASCII-art QR
// rendering, a short text code isn't affected), persists the session to
// disk (AUTH_DIR) so restarts/redeploys don't need to log in again, and
// exposes sendOrderMessage() for server.js to call.
//
// IMPORTANT — read before running this in production:
// Baileys talks to WhatsApp over the same protocol the real WhatsApp Web
// client uses, but it is NOT an official/sanctioned API — there is no
// approval process, but there is also no guarantee WhatsApp won't flag or
// ban a number for automated behavior. This script is built for exactly
// one thing: notifying yourself (the store owner) about your own orders,
// at low volume (one message per order). Do NOT repurpose this to message
// customers, broadcast, or send at any real volume — that is exactly the
// kind of automated pattern that gets numbers banned. Keep it to yourself,
// keep it occasional, and have a backup way to hear about orders (e.g.
// checking the admin panel) in case WhatsApp ever blocks this number.

import { Boom } from "@hapi/boom";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";

const AUTH_DIR = process.env.AUTH_DIR || "./auth_info_baileys";
const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || "warn" });

let sock = null;
// Resolved once the socket reaches "open" — every send waits on this so a
// request arriving right after a (re)connect doesn't race an unready socket.
let readyResolve;
let readyPromise = new Promise((resolve) => {
  readyResolve = resolve;
});

// Baileys closes the connection with a 401 ("Connection Failure") right
// after a pairing code is issued and the phone hasn't entered it yet —
// this is a normal part of the pairing handshake, not a real account
// logout, and was confirmed by inspecting the raw disconnect payload
// directly rather than assuming. A *genuine* logout (401 after a session
// that was actually `registered`) is different and should stop retrying.
// Tracked here so a reconnect while still pairing doesn't request a brand
// new code every time (which would both spam WhatsApp's servers and keep
// invalidating the code the user is mid-typing) — only re-request once
// the previous code has had time to expire (WhatsApp codes are valid for
// about 60s).
let lastPairingCodeAt = 0;
const PAIRING_CODE_MIN_INTERVAL_MS = 55_000;

// Safety cap: if the connection can't stay up long enough to ever finish
// pairing, retrying forever just means retrying forever *against
// WhatsApp's real servers*, unsupervised, which is exactly the kind of
// automated-looking pattern that risks getting the number flagged — the
// opposite of "low volume." After this many consecutive failures while
// still unregistered, give up and require a manual restart (a real
// person deciding "try again now") rather than looping indefinitely.
let consecutiveUnregisteredFailures = 0;
const MAX_UNREGISTERED_FAILURES = 15;
let gaveUp = false;

function resetReadyGate() {
  readyPromise = new Promise((resolve) => {
    readyResolve = resolve;
  });
}

export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    // Tighter than Baileys' 30s default — a shorter ping-pong interval
    // detects a dead/dropped connection sooner and can help connection
    // stability on some cloud network paths (a real, if unproven, factor
    // in the fast repeated disconnects seen while pairing on Railway).
    keepAliveIntervalMs: 10_000,
    // No printQRInTerminal — deliberately not using QR login at all now.
    // The `qr` field is still handled defensively below (harmless no-op
    // if it never fires), but the primary login path is the pairing code
    // requested right after this block.
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(
        "\n[whatsapp] a QR code was also offered, but this service logs in via pairing code instead — see the code printed below.\n"
      );
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("[whatsapp] connected");
      consecutiveUnregisteredFailures = 0;
      readyResolve();
    }

    if (connection === "close") {
      resetReadyGate();
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : undefined;
      const wasRegistered = sock?.authState?.creds?.registered;
      // Only treat a 401 as a real, final logout when we previously had a
      // working (registered) session — a 401 while still mid-pairing is
      // the normal "code issued, not entered yet" close (see the comment
      // on lastPairingCodeAt above), and should just reconnect and wait.
      const genuinelyLoggedOut =
        statusCode === DisconnectReason.loggedOut && wasRegistered;

      if (genuinelyLoggedOut) {
        console.error(
          "[whatsapp] session logged out — delete AUTH_DIR and restart to link again with a fresh pairing code."
        );
        return;
      }

      if (!wasRegistered) {
        consecutiveUnregisteredFailures += 1;
        if (consecutiveUnregisteredFailures >= MAX_UNREGISTERED_FAILURES) {
          gaveUp = true;
          console.error(
            `[whatsapp] gave up after ${MAX_UNREGISTERED_FAILURES} consecutive failed connection attempts without ever pairing. ` +
              "Not retrying further — this looks like more than normal pairing-handshake flakiness (possibly WhatsApp rate-limiting " +
              "this number/host after repeated attempts). Stop this service, wait several hours, then manually restart to try again. " +
              "See whatsapp-notifier/README.md's Troubleshooting section."
          );
          return;
        }
      }

      console.warn(
        `[whatsapp] connection closed, reconnecting... ${statusCode ?? ""} (attempt ${consecutiveUnregisteredFailures}/${MAX_UNREGISTERED_FAILURES})`
      );
      // Deliberately not fast: reconnecting in a tight loop both hammers
      // WhatsApp's servers (exactly the automated-looking pattern this
      // project's own "keep it low-volume" warning is about) and — since
      // each reconnect briefly interrupts the socket — may itself be
      // working against a clean pairing handshake completing. 8s trades a
      // slightly longer gap for a calmer, more stable-looking connection
      // pattern while a pairing code is outstanding.
      setTimeout(() => {
        startWhatsApp().catch((err) =>
          console.error("[whatsapp] reconnect failed:", err)
        );
      }, 8000);
    }
  });

  // Pairing-code login: only relevant before the first successful link —
  // once registered (persisted via creds.update -> saveCreds), this whole
  // block is skipped on every future reconnect. While still unregistered,
  // a fresh code is only requested once the previous one has had time to
  // expire (~55s), not on every reconnect — the close-and-reconnect cycle
  // while mid-pairing (see above) would otherwise request a brand new
  // code every few seconds, which is both confusing (the code you're
  // typing keeps going stale) and looks like automated hammering to
  // WhatsApp's servers.
  if (!sock.authState.creds.registered) {
    const dueForNewCode = Date.now() - lastPairingCodeAt > PAIRING_CODE_MIN_INTERVAL_MS;
    if (dueForNewCode) {
      const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
      if (!ownerNumber) {
        console.error(
          "[whatsapp] OWNER_WHATSAPP_NUMBER is not set — cannot request a pairing code. Set it and restart."
        );
      } else {
        lastPairingCodeAt = Date.now();
        await requestPairingCodeWithRetry(sock, ownerNumber);
      }
    }
  }

  return sock;
}

function digitsOnly(rawNumber) {
  // Expects country code + number, no "+", no spaces — e.g. "96181962691".
  return rawNumber.replace(/\D/g, "");
}

async function requestPairingCodeWithRetry(sock, ownerNumber, attempt = 1) {
  try {
    const code = await sock.requestPairingCode(digitsOnly(ownerNumber));
    console.log("\n==================================================");
    console.log(" TIP: get your phone to the entry screen BEFORE you");
    console.log(" refresh this log — WhatsApp only gives you ~60s per");
    console.log(" code. WhatsApp -> Settings -> Linked Devices -> Link");
    console.log(" a Device -> \"Link with phone number instead\" -- have");
    console.log(" that screen open and ready, THEN check the code below.");
    console.log(` [whatsapp] PAIRING CODE: ${code}`);
    console.log(" Enter it now.");
    console.log("==================================================\n");
  } catch (err) {
    if (attempt >= 3) {
      console.error(
        "[whatsapp] failed to request a pairing code after 3 attempts:",
        err
      );
      return;
    }
    console.warn(
      `[whatsapp] pairing code request failed (attempt ${attempt}/3), retrying in 2s...`,
      err?.message ?? err
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await requestPairingCodeWithRetry(sock, ownerNumber, attempt + 1);
  }
}

function toWhatsAppJid(rawNumber) {
  // WhatsApp individual-chat JIDs look like "<digits>@s.whatsapp.net".
  return `${digitsOnly(rawNumber)}@s.whatsapp.net`;
}

/**
 * Sends a plain-text WhatsApp message to the configured owner number.
 * Waits (with a timeout) for the socket to be connected first, so a
 * request that arrives during a reconnect doesn't fail outright.
 */
export async function sendOrderMessage(text) {
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
  if (!ownerNumber) {
    throw new Error("OWNER_WHATSAPP_NUMBER is not set");
  }

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            gaveUp
              ? "WhatsApp connection gave up after repeated failures — the service needs a manual restart, see its logs"
              : "WhatsApp socket not ready (timed out after 20s)"
          )
        ),
      20_000
    )
  );
  await Promise.race([readyPromise, timeout]);

  const jid = toWhatsAppJid(ownerNumber);
  await sock.sendMessage(jid, { text });
}
