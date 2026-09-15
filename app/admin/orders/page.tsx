import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";
import { StatusChip } from "@/components/admin/StatusChip";

type Row = {
  id: string;
  reference: string;
  status: string;
  total_kes: number;
  created_at: string;
  courier: string | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

/** The queue views. "To produce" is the workshop's default. */
const VIEWS = [
  { key: "produce", label: "TO PRODUCE", statuses: ["paid", "in_production"] },
  { key: "dispatched", label: "DISPATCHED", statuses: ["shipped"] },
  { key: "delivered", label: "DELIVERED", statuses: ["delivered"] },
  { key: "pending", label: "AWAITING PAYMENT", statuses: ["pending_payment"] },
  { key: "closed", label: "CANCELLED / REFUNDED", statuses: ["cancelled", "refunded"] },
  { key: "all", label: "ALL", statuses: null },
] as const;

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const { view: viewKey, q = "" } = await searchParams;
  const view = VIEWS.find((v) => v.key === viewKey) ?? VIEWS[0];
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, reference, status, total_kes, created_at, courier, profiles(full_name, phone)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (view.statuses) query = query.in("status", [...view.statuses]);
  const { data, error } = await query.returns<Row[]>();

  // Search runs over the loaded page — fine at launch volume; move it into SQL
  // (an RPC across orders + profiles) once orders run into the hundreds a month.
  const needle = q.trim().toLowerCase();
  const orders = (data ?? []).filter(
    (o) =>
      !needle ||
      [o.reference, o.profiles?.full_name, o.profiles?.phone].some((v) => v?.toLowerCase().includes(needle)),
  );

  return (
    <div className="mt-6">
      <h1 className="font-display text-4xl tracking-[0.15em]">ORDERS</h1>

      <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-3 font-mono text-[10px] tracking-[0.2em]">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={{ pathname: "/admin/orders", query: { view: v.key, ...(q ? { q } : {}) } }}
            className={v.key === view.key ? "text-ink" : "text-ink-faint hover:text-ink-dim"}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <form className="mt-6 flex gap-3" action="/admin/orders">
        <input type="hidden" name="view" value={view.key} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search reference, customer or phone"
          className="w-full max-w-md border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint"
        />
        <button className="border border-line px-5 font-mono text-[10px] tracking-[0.2em] text-ink-dim hover:border-ink-faint">
          SEARCH
        </button>
      </form>

      {error && <p role="alert" className="mt-6 font-mono text-[11px] text-danger">{error.message}</p>}

      {orders.length === 0 ? (
        <p className="mt-12 text-sm text-ink-dim">{needle ? `No orders match “${q}”.` : "Nothing here."}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line-soft border-y border-line-soft">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4 hover:opacity-80">
                <span className="w-14 text-xs text-ink-faint">{dateFormat.format(new Date(o.created_at))}</span>
                <span className="w-36 font-mono text-[11px] text-ink-dim">{o.reference}</span>
                <span className="min-w-40 flex-1 text-sm">{o.profiles?.full_name ?? "—"}</span>
                <span className="flex w-44 items-center gap-2">
                  <StatusChip status={o.status} />
                  {o.status === "shipped" && o.courier && <span className="truncate text-xs text-ink-faint">{o.courier}</span>}
                </span>
                <span className="w-28 text-right text-sm">{formatKES(o.total_kes)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
