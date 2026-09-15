import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";

type Row = {
  id: string;
  reference: string;
  status: string;
  total_kes: number;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

/** The workshop's queue. Paid and in-production orders sort to the top. */
export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, reference, status, total_kes, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const queue = (data ?? []).filter((o) => o.status === "paid" || o.status === "in_production");
  const rest = (data ?? []).filter((o) => !queue.includes(o));

  return (
    <div className="mt-12">
      <h1 className="font-display text-4xl tracking-[0.15em]">ORDERS</h1>

      {!data?.length ? (
        <p className="mt-16 text-sm text-ink-dim">
          No orders yet. They appear here once checkout is live.
        </p>
      ) : (
        <>
          <OrderList title="TO PRODUCE" orders={queue} />
          <OrderList title="EVERYTHING ELSE" orders={rest} />
        </>
      )}
    </div>
  );
}

function OrderList({ title, orders }: { title: string; orders: Row[] }) {
  if (orders.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">{title}</h2>
      <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 py-4 hover:opacity-80">
              <span className="w-32 font-mono text-[11px] text-ink-faint">{o.reference}</span>
              <span className="flex-1 text-sm">{o.profiles?.full_name ?? "—"}</span>
              <span className="w-32 font-mono text-[10px] tracking-[0.15em] text-ink-dim">
                {o.status.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="w-28 text-right font-mono text-sm">{formatKES(o.total_kes)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
