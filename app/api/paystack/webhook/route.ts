import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * The only thing that may mark an order paid on Paystack's word.
 *
 * Signature is HMAC-SHA512 of the RAW body with the secret key, so the body is
 * read as text and parsed afterwards — re-serialising JSON would change the
 * bytes and break verification.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event.event !== "charge.success") return NextResponse.json({ ok: true });

  const reference = event.data?.reference;
  if (!reference) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, total_kes, status")
    .eq("reference", reference)
    .single();

  if (!order) return NextResponse.json({ ok: true });

  // Paid amount must match what we charged. A mismatch is not an order to
  // produce — it is something to look at by hand.
  const paidKES = Math.round((event.data.amount ?? 0) / 100);
  if (paidKES !== order.total_kes) {
    await admin.from("orders")
      .update({ notes: `⚠ Paid ${paidKES} KES against a total of ${order.total_kes} KES.` })
      .eq("id", order.id);
    return NextResponse.json({ ok: true });
  }

  // Guarded on the current status so a replayed webhook cannot move an order
  // that has already gone into production back to `paid`.
  await admin
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "pending_payment");

  return NextResponse.json({ ok: true });
}
