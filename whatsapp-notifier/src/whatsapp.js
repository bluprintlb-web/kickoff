// Baileys connection manager: logs in once via QR code, persists the
// session to disk (AUTH_DIR) so restarts/redeploys don't need a new QR,
// and exposes sendOrderMessage() for server.js to call.
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
    // Baileys deprecated printQRInTerminal in favor of handling the `qr`
    // field on connection.update yourself — done manually below so this
    // doesn't silently break on a library update.
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nScan this QR code with WhatsApp (Linked Devices) — one-time setup:\n");
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("[whatsapp] connected");
      readyResolve();
    }

    if (connection === "close") {
      resetReadyGate();
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : undefined;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.error(
          "[whatsapp] session logged out — delete AUTH_DIR and restart to re-scan a QR code."
        );
        return;
      }

      console.warn("[whatsapp] connection closed, reconnecting...", statusCode ?? "");
      startWhatsApp().catch((err) =>
        console.error("[whatsapp] reconnect failed:", err)
      );
    }
  });

  return sock;
}

function toWhatsAppJid(rawNumber) {
  // Expects digits only (country code + number, no "+", no spaces) —
  // e.g. "96181962691". WhatsApp individual-chat JIDs look like
  // "<digits>@s.whatsapp.net".
  const digits = rawNumber.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
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
    setTimeout(() => reject(new Error("WhatsApp socket not ready (timed out after 20s)")), 20_000)
  );
  await Promise.race([readyPromise, timeout]);

  const jid = toWhatsAppJid(ownerNumber);
  await sock.sendMessage(jid, { text });
}
