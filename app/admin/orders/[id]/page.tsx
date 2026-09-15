import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SLOTS, slotKey, slotLabel, type Finger, type Hand } from "@/lib/catalogue";
import { formatKES } from "@/lib/money";
import { OrderStatus } from "@/components/admin/OrderStatus";

type Row = {
  id: string;
  reference: string;
  status: string;
  subtotal_kes: number;
  shipping_kes: number;
  total_kes: number;
  packaging: string | null;
  notes: string | null;
  created_at: string;
  /** Snapshotted at checkout, keyed "left-thumb" → width in mm. */
  measurements: Record<string, number>;
  shipping_address: Record<string, string> | null;
  profiles: { full_name: string | null; phone: string | null } | null;
  order_items: {
    id: string;
    slot_hand: Hand | null;
    slot_finger: Finger | null;
    product_name: string;
    options: { shape?: string };
    unit_price_kes: number;
  }[];
};

/**
 * The print sheet. Everything the workshop needs on one page: which design in
 * which shape goes on which finger, and at what width.
 *
 * The widths come from `orders.measurements` — the snapshot taken at checkout,
 * NOT the customer's current profile. Never "fix" this into a join.
 */
export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, reference, status, subtotal_kes, shipping_kes, total_kes, packaging, notes, created_at, measurements, shipping_address, profiles(full_name, phone), order_items(id, slot_hand, slot_finger, product_name, options, unit_price_kes)")
    .eq("id", id)
    .single<Row>();

  if (!order) notFound();

  const bySlot = new Map(
    order.order_items
      .filter((i) => i.slot_hand && i.slot_finger)
      .map((i) => [`${i.slot_hand}-${i.slot_finger}`, i]),
  );

  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl tracking-[0.15em]">{order.reference}</h1>
          <p className="mt-2 text-sm text-ink-dim">
            {order.profiles?.full_name ?? "—"} · {order.profiles?.phone ?? "no phone"}
          </p>
        </div>
        <OrderStatus orderId={order.id} status={order.status} />
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">PRINT SHEET</h2>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] tracking-[0.2em] text-ink-faint">
              <th className="py-2 font-normal">FINGER</th>
              <th className="py-2 font-normal">DESIGN</th>
              <th className="py-2 font-normal">SHAPE</th>
              <th className="py-2 text-right font-normal">WIDTH</th>
              <th className="py-2 text-right font-normal">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => {
              const item = bySlot.get(slotKey(slot));
              const width = order.measurements?.[slotKey(slot)];
              return (
                <tr key={slotKey(slot)} className="border-b border-line-soft">
                  <td className="py-3 font-mono text-[11px] text-ink-dim">
                    {slotLabel(slot).toUpperCase()}
                  </td>
                  <td className="py-3">{item?.product_name ?? <span className="text-danger">missing</span>}</td>
                  <td className="py-3 font-mono text-[11px] text-ink-dim">
                    {item?.options.shape?.toUpperCase() ?? "—"}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px]">
                    {width ? `${width} mm` : <span className="text-danger">no size</span>}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] text-ink-dim">
                    {item ? formatKES(item.unit_price_kes) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <dl className="mt-10 grid gap-6 font-mono text-[11px] sm:grid-cols-3">
        <div>
          <dt className="text-ink-faint">SUBTOTAL</dt>
          <dd className="mt-1">{formatKES(order.subtotal_kes)}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">SHIPPING</dt>
          <dd className="mt-1">{formatKES(order.shipping_kes)}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">TOTAL</dt>
          <dd className="mt-1">{formatKES(order.total_kes)}</dd>
        </div>
        {order.packaging && (
          <div>
            <dt className="text-ink-faint">PACKAGING</dt>
            <dd className="mt-1">{order.packaging}</dd>
          </div>
        )}
        {order.notes && (
          <div className="sm:col-span-3">
            <dt className="text-ink-faint">NOTES</dt>
            <dd className="mt-1 text-ink-dim">{order.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
