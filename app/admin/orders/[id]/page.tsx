import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SLOTS, slotKey, slotLabel, type Finger, type Hand } from "@/lib/catalogue";
import { formatKES } from "@/lib/money";
import { VAT_LABEL } from "@/lib/tax";
import { OrderStatus } from "@/components/admin/OrderStatus";
import { DispatchForm } from "@/components/admin/DispatchForm";
import { PrintButton } from "@/components/admin/PrintButton";
import { StatusChip, statusLabel } from "@/components/admin/StatusChip";

type Row = {
  id: string;
  reference: string;
  status: string;
  subtotal_kes: number;
  shipping_kes: number;
  vat_kes: number;
  total_kes: number;
  packaging: string | null;
  notes: string | null;
  created_at: string;
  courier: string | null;
  tracking_ref: string | null;
  dispatched_at: string | null;
  paid_at: string | null;
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
    .select("id, reference, status, subtotal_kes, shipping_kes, vat_kes, total_kes, packaging, notes, created_at, paid_at, courier, tracking_ref, dispatched_at, measurements, shipping_address, profiles(full_name, phone), order_items(id, slot_hand, slot_finger, product_name, options, unit_price_kes)")
    .eq("id", id)
    .single<Row>();

  if (!order) notFound();

  const { data: events } = await supabase
    .from("activity_log")
    .select("id, action, from_status, to_status, note, created_at, profiles(full_name)")
    .eq("entity_type", "order")
    .eq("entity_id", order.id)
    .order("created_at", { ascending: true })
    .returns<Event[]>();
  const timeline = withFallbacks(order, events ?? []);

  const bySlot = new Map(
    order.order_items
      .filter((i) => i.slot_hand && i.slot_finger)
      .map((i) => [`${i.slot_hand}-${i.slot_finger}`, i]),
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl tracking-[0.1em] sm:text-4xl">{order.reference}</h1>
            <StatusChip status={order.status} />
          </div>
          <p className="mt-2 text-sm text-ink-dim">
            {order.profiles?.full_name ?? "—"} · {order.profiles?.phone ?? "no phone"}
          </p>
          <p className="mt-1 text-xs text-ink-faint">Placed {when(order.created_at)}</p>
        </div>
        <div className="flex w-full flex-wrap items-start gap-3 sm:w-auto">
          <PrintButton />
          <OrderStatus orderId={order.id} status={order.status} />
        </div>
      </div>

      {(order.status === "paid" || order.status === "in_production") && (
        <section className="mt-10 print:hidden">
          <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">DISPATCH</h2>
          <div className="mt-4">
            <DispatchForm orderId={order.id} />
          </div>
        </section>
      )}
      {order.courier && (
        <p className="mt-10 border border-line p-5 font-mono text-[11px] text-ink-dim">
          DISPATCHED
          {order.dispatched_at &&
            ` ${new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(order.dispatched_at))}`}{" "}
          · {order.courier}
          {order.tracking_ref && ` · ${order.tracking_ref}`}
        </p>
      )}

      <section className="mt-12">
        <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">PRINT SHEET</h2>
        <table className="mt-4 w-full border-collapse text-sm break-inside-avoid">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] tracking-[0.2em] text-ink-faint">
              <th className="py-2 font-normal">FINGER</th>
              <th className="py-2 font-normal">DESIGN</th>
              <th className="py-2 font-normal">SHAPE</th>
              <th className="py-2 text-right font-normal">WIDTH</th>
              <th className="hidden py-2 text-right font-normal sm:table-cell print:table-cell">PRICE</th>
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
                  <td className="hidden py-3 text-right font-mono text-[11px] text-ink-dim sm:table-cell print:table-cell">
                    {item ? formatKES(item.unit_price_kes) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <dl className="mt-10 grid grid-cols-2 gap-6 font-mono text-[11px] sm:grid-cols-4">
        <div>
          <dt className="text-ink-faint">SUBTOTAL</dt>
          <dd className="mt-1">{formatKES(order.subtotal_kes)}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">SHIPPING</dt>
          <dd className="mt-1">{formatKES(order.shipping_kes)}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">{VAT_LABEL.toUpperCase()}</dt>
          <dd className="mt-1">{formatKES(order.vat_kes)}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">TOTAL (INCL. VAT)</dt>
          <dd className="mt-1">{formatKES(order.total_kes)}</dd>
        </div>
        {order.shipping_address && (
          <div className="sm:col-span-4">
            <dt className="text-ink-faint">DELIVER TO</dt>
            <dd className="mt-1 text-ink-dim">
              {["name", "phone", "address", "town", "county"]
                .map((key) => order.shipping_address?.[key])
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </div>
        )}
        {order.packaging && (
          <div>
            <dt className="text-ink-faint">PACKAGING</dt>
            <dd className="mt-1">{order.packaging}</dd>
          </div>
        )}
        {order.notes && (
          <div className="sm:col-span-4">
            <dt className="text-ink-faint">NOTES</dt>
            <dd className="mt-1 text-ink-dim">{order.notes}</dd>
          </div>
        )}
      </dl>

      <section className="mt-14 print:hidden">
        <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">TIMELINE</h2>
        <ol className="mt-4 border-l border-line">
          {timeline.map((e) => (
            <li key={e.id} className="relative pb-5 pl-6">
              <span aria-hidden="true" className="absolute -left-[5px] top-1.5 size-[9px] rounded-full border border-line bg-ground" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm">{describe(e)}</span>
                {e.to_status && <StatusChip status={e.to_status} />}
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                {when(e.created_at)} · {e.profiles?.full_name ?? (e.inferred ? "from order record" : "system")}
              </p>
              {e.note && <p className="mt-1 text-sm text-ink-dim">{e.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

type Event = {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
  /** Rebuilt from the order's own timestamps — for orders placed before the log existed. */
  inferred?: boolean;
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(iso));

function describe(e: Event) {
  switch (e.action) {
    case "placed":
      return "Order placed";
    case "paid":
      return "Payment confirmed";
    case "payment_mismatch":
      return "Payment amount did not match";
    case "dispatched":
      return "Dispatched";
    case "status_changed":
      return `${statusLabel(e.from_status ?? "")} → ${statusLabel(e.to_status ?? "")}`;
    default:
      return e.action.replace(/_/g, " ");
  }
}

/** Orders from before the activity log still get placed / paid / dispatched entries. */
function withFallbacks(
  order: { id: string; created_at: string; paid_at: string | null; dispatched_at: string | null; courier: string | null; tracking_ref: string | null },
  events: Event[],
): Event[] {
  const has = (action: string) => events.some((e) => e.action === action);
  const inferred: Event[] = [];
  const base = { from_status: null, note: null, profiles: null, inferred: true };
  if (!has("placed")) inferred.push({ ...base, id: `${order.id}-placed`, action: "placed", to_status: null, created_at: order.created_at });
  if (order.paid_at && !has("paid")) inferred.push({ ...base, id: `${order.id}-paid`, action: "paid", to_status: "paid", created_at: order.paid_at });
  if (order.dispatched_at && !has("dispatched")) {
    inferred.push({
      ...base,
      id: `${order.id}-dispatched`,
      action: "dispatched",
      to_status: "shipped",
      note: [order.courier, order.tracking_ref].filter(Boolean).join(" · ") || null,
      created_at: order.dispatched_at,
    });
  }
  return [...inferred, ...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
