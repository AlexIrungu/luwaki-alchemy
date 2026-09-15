import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";
import { SLOTS, slotKey, slotLabel, type Finger, type Hand } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Orders" };

type Row = {
  id: string;
  reference: string;
  status: string;
  total_kes: number;
  created_at: string;
  order_items: {
    id: string;
    slot_hand: Hand | null;
    slot_finger: Finger | null;
    product_name: string;
    options: { shape?: string };
  }[];
};

const STATUS_COPY: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid — queued for production",
  in_production: "Being printed",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, reference, status, total_kes, created_at, order_items(id, slot_hand, slot_finger, product_name, options)")
    .eq("profile_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl tracking-[0.15em]">ORDERS</h1>

        {!orders?.length ? (
          <p className="mt-16 text-sm text-ink-dim">Nothing yet.</p>
        ) : (
          <ul className="mt-10 space-y-6">
            {orders.map((order) => {
              const bySlot = new Map(
                order.order_items
                  .filter((i) => i.slot_hand && i.slot_finger)
                  .map((i) => [`${i.slot_hand}-${i.slot_finger}`, i]),
              );

              return (
                <li key={order.id} className="border border-line p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px]">{order.reference}</span>
                    <span className="font-mono text-[10px] tracking-[0.15em] text-ink-dim">
                      {STATUS_COPY[order.status] ?? order.status}
                    </span>
                  </div>

                  <ul className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {SLOTS.map((slot) => {
                      const item = bySlot.get(slotKey(slot));
                      return (
                        <li key={slotKey(slot)} className="flex gap-3 text-sm">
                          <span className="w-20 font-mono text-[10px] tracking-[0.1em] text-ink-faint">
                            {slotLabel(slot).toUpperCase()}
                          </span>
                          <span className="flex-1 text-ink-dim">
                            {item?.product_name ?? "—"}
                          </span>
                          <span className="font-mono text-[10px] text-ink-faint">
                            {item?.options.shape?.toUpperCase() ?? ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-5 border-t border-line-soft pt-4 text-right font-mono text-sm">
                    {formatKES(order.total_kes)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
