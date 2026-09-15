import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isLive, payments } from "@/lib/payments/provider";
import { formatKES } from "@/lib/money";
import { VAT_LABEL } from "@/lib/tax";
import { ClearCart } from "@/components/ClearCart";

export const metadata: Metadata = { title: "Order placed" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; simulated?: string }>;
}) {
  const { reference, simulated } = await searchParams;
  if (!reference) redirect("/");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: order } = await supabase
    .from("orders")
    .select("id, reference, status, vat_kes, total_kes")
    .eq("reference", reference)
    .single();

  if (!order) redirect("/");

  /*
   * The webhook is what actually marks an order paid — a customer landing here
   * proves nothing, and they may never land here at all. This confirms with
   * the provider directly so the page can tell the truth while the webhook is
   * still in flight.
   *
   * The simulated branch exists only while Paystack keys are absent.
   */
  let status = order.status;
  if (status === "pending_payment") {
    const confirmed = simulated && !isLive() ? { paid: true } : await payments.verify(reference);

    if (confirmed.paid) {
      const admin = createAdminClient();
      await admin
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("status", "pending_payment");
      status = "paid";
    }
  }

  const paid = status !== "pending_payment";

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-2xl">
        {paid && <ClearCart />}
        <h1 className="font-display text-4xl tracking-[0.15em]">
          {paid ? "ORDER PLACED" : "AWAITING PAYMENT"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-dim">
          {paid
            ? "Your set goes into production against the measurements on your account. We will be in touch about delivery."
            : "We have not had confirmation of your payment yet. If you completed it, this will update shortly."}
        </p>

        <dl className="mt-10 grid gap-4 border border-line bg-panel p-5 font-mono text-[11px] sm:grid-cols-3">
          <div>
            <dt className="text-ink-faint">REFERENCE</dt>
            <dd className="mt-1">{order.reference}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">{VAT_LABEL.toUpperCase()}</dt>
            <dd className="mt-1">{formatKES(order.vat_kes)}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">TOTAL (INCL. VAT)</dt>
            <dd className="mt-1">{formatKES(order.total_kes)}</dd>
          </div>
        </dl>

        <Link
          href="/account/orders"
          className="mt-10 inline-block border border-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] hover:bg-ink hover:text-ground"
        >
          YOUR ORDERS
        </Link>
      </div>
    </div>
  );
}
