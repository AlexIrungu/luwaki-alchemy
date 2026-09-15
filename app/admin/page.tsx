import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";
import { StatusChip } from "@/components/admin/StatusChip";

/** Orders that count as sales: money received and not given back. */
const SOLD = ["paid", "in_production", "shipped", "delivered"];

/** Start of the current month in Nairobi (UTC+3, no daylight saving), as an ISO instant. */
function monthStartNairobi() {
  const nairobi = new Date(Date.now() + 3 * 3600_000);
  return new Date(Date.UTC(nairobi.getUTCFullYear(), nairobi.getUTCMonth(), 1) - 3 * 3600_000).toISOString();
}

type SaleRow = { total_kes: number; vat_kes: number };
type RecentRow = {
  id: string;
  reference: string;
  status: string;
  total_kes: number;
  created_at: string;
  profiles: { full_name: string | null } | null;
};
type DesignRow = { id: string; name: string; is_published: boolean; description: string | null };

export default async function AdminPage() {
  const supabase = await createClient();
  const since = monthStartNairobi();

  const [sales, awaitingProduction, commissions, messages, subscribers, recent, designs] = await Promise.all([
    supabase.from("orders").select("total_kes, vat_kes").in("status", SOLD).gte("paid_at", since).returns<SaleRow[]>(),
    supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "in_production"]),
    supabase.from("commissions").select("*", { count: "exact", head: true }).eq("stage", "brief"),
    supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("handled", false),
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id, reference, status, total_kes, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<RecentRow[]>(),
    supabase.from("products").select("id, name, is_published, description").order("name").returns<DesignRow[]>(),
  ]);

  const revenue = (sales.data ?? []).reduce((sum, o) => sum + o.total_kes, 0);
  const vat = (sales.data ?? []).reduce((sum, o) => sum + o.vat_kes, 0);
  const month = new Intl.DateTimeFormat("en-KE", { month: "long", timeZone: "Africa/Nairobi" }).format(new Date());

  const drafts = (designs.data ?? []).filter((d) => !d.is_published);
  const noCopy = (designs.data ?? []).filter((d) => !d.description?.trim());

  const money = [
    { label: `SALES · ${month.toUpperCase()}`, value: formatKES(revenue), note: `${sales.data?.length ?? 0} orders, incl. VAT` },
    { label: `VAT · ${month.toUpperCase()}`, value: formatKES(vat), note: "16%, collected on those orders" },
  ];
  const stats = [
    { label: "TO PRODUCE", value: awaitingProduction.count ?? 0, href: "/admin/orders" },
    { label: "NEW BRIEFS", value: commissions.count ?? 0, href: "/admin/commissions" },
    { label: "UNREAD", value: messages.count ?? 0, href: "/admin/messages" },
    { label: "SUBSCRIBERS", value: subscribers.count ?? 0, href: null },
  ];

  return (
    <div className="mt-6">
      <h1 className="font-display text-4xl tracking-[0.15em]">OVERVIEW</h1>

      {sales.error && (
        <p role="alert" className="mt-6 font-mono text-[11px] text-danger">
          Sales figures unavailable: {sales.error.message}
        </p>
      )}

      <dl className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2">
        {money.map((m) => (
          <div key={m.label} className="bg-ground p-6">
            <dt className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">{m.label}</dt>
            <dd className="mt-2 font-display text-5xl">{m.value}</dd>
            <dd className="mt-2 font-mono text-[10px] text-ink-faint">{m.note}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-px grid gap-px border border-t-0 border-line bg-line grid-cols-2 sm:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <dt className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">{s.label}</dt>
              <dd className="mt-2 font-display text-4xl">{s.value}</dd>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="bg-ground p-6 hover:bg-panel">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="bg-ground p-6">
              {body}
            </div>
          );
        })}
      </dl>

      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">LATEST ORDERS</h2>
            <Link href="/admin/orders" className="font-mono text-[10px] tracking-[0.2em] text-ink-dim hover:text-ink">
              ALL →
            </Link>
          </div>
          {recent.data?.length ? (
            <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
              {recent.data.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                    <span className="flex-1 truncate text-sm">{o.profiles?.full_name ?? o.reference}</span>
                    <StatusChip status={o.status} />
                    <span className="w-24 text-right text-sm">{formatKES(o.total_kes)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-dim">No orders yet.</p>
          )}
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">CATALOGUE — NEEDS ATTENTION</h2>
          <AttentionList title="Unpublished" designs={drafts} />
          <AttentionList title="No description yet" designs={noCopy} />
          {!drafts.length && !noCopy.length && <p className="mt-4 text-sm text-ink-dim">Every design is live with copy.</p>}
        </section>
      </div>
    </div>
  );
}

function AttentionList({ title, designs }: { title: string; designs: DesignRow[] }) {
  if (!designs.length) return null;
  return (
    <details className="mt-4 border-y border-line-soft py-3">
      <summary className="flex cursor-pointer items-baseline justify-between text-sm">
        {title}
        <span className="font-mono text-[11px] text-flag">{designs.length}</span>
      </summary>
      <ul className="mt-3 flex flex-wrap gap-2">
        {designs.map((d) => (
          <li key={d.id}>
            <Link href={`/admin/products/${d.id}`} className="block border border-line px-3 py-1 font-mono text-[10px] text-ink-dim hover:border-ink-faint">
              {d.name}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
