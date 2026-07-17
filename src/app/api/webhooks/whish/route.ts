import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Stub — Whish doesn't have public webhook documentation we could verify
 * against (see src/lib/payments/whish.ts for what we do and don't know).
 * Before relying on this in production:
 *  1. Verify the request signature/secret against Whish's real docs —
 *     right now this trusts the payload as-is, which is NOT safe.
 *  2. Confirm their actual field names and map them below.
 */
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as
    | { orderId?: string; status?: string }
    | null;

  if (!payload?.orderId || !payload?.status) {
    return NextResponse.json({ error: "Unrecognized payload" }, { status: 400 });
  }

  await prisma.order
    .update({
      where: { id: payload.orderId },
      data: { status: payload.status === "success" ? "PAID" : "CANCELLED" },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
