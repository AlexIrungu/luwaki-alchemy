import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { loadCustomers, loadSubscribers } from "@/lib/customers";
import { formatKES } from "@/lib/money";

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // This page reads with the service-role client, so it checks the role itself too.
  const { error: auth } = await requireAdmin();
  if (auth) redirect("/");

  const { q = "" } = await searchParams;
  const customers = await loadCustomers();
  const subscribers = await loadSubscribers(customers);

  const needle = q.trim().toLowerCase();
  const shown = customers.filter(
    (c) => !needle || [c.name, c.email, c.phone].some((v) => v?.toLowerCase().includes(needle)),
  );
  const buyers = customers.filter((c) => c.orders > 0).length;
  const ready = customers.filter((c) => c.measured === 10).length;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl tracking-[0.15em]">CUSTOMERS</h1>
        {/* A plain link: the browser downloads the CSV route's attachment. */}
        <a
          href="/admin/customers/newsletter.csv"
          className="border border-ink px-6 py-3 font-mono text-[11px] tracking-[0.2em] hover:bg-ink hover:text-ground"
        >
          NEWSLETTER CSV · {subscribers.length}
        </a>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-5">
        {[
          ["ACCOUNTS", customers.length],
          ["HAVE ORDERED", buyers],
          ["ALL TEN MEASURED", ready],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-[9px] tracking-[0.25em] text-ink-faint">{label}</dt>
            <dd className="mt-1 font-display text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      <form className="mt-6 flex gap-3" action="/admin/customers">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email or phone"
          className="w-full max-w-md border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint"
        />
        <button className="border border-line px-5 font-mono text-[10px] tracking-[0.2em] text-ink-dim hover:border-ink-faint">
          SEARCH
        </button>
      </form>

      {shown.length === 0 ? (
        <p className="mt-12 text-sm text-ink-dim">{needle ? `No customers match “${q}”.` : "No accounts yet."}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line font-mono text-[9px] tracking-[0.2em] text-ink-faint">
              <tr>
                <th className="py-3 font-normal">CUSTOMER</th>
                <th className="py-3 font-normal">PHONE</th>
                <th className="py-3 font-normal">JOINED</th>
                <th className="py-3 font-normal">SIZES</th>
                <th className="py-3 text-right font-normal">ORDERS</th>
                <th className="py-3 text-right font-normal">SPENT</th>
                <th className="py-3 text-right font-normal">NEWS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {shown.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-4">
                    <span className="block">
                      {c.name ?? "—"}
                      {c.role === "admin" && <span className="ml-2 font-mono text-[9px] tracking-[0.2em] text-resin">ADMIN</span>}
                    </span>
                    <span className="block font-mono text-[11px] text-ink-faint">{c.email ?? "—"}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[11px] text-ink-dim">
                    {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-ink">{c.phone}</a> : "—"}
                  </td>
                  <td className="py-3 pr-4 text-xs text-ink-faint">{dateFormat.format(new Date(c.joinedAt))}</td>
                  <td className={`py-3 pr-4 font-mono text-[11px] ${c.measured === 10 ? "text-resin" : "text-flag"}`}>{c.measured}/10</td>
                  <td className="py-3 text-right">{c.orders}</td>
                  <td className="py-3 text-right">{c.spentKES ? formatKES(c.spentKES) : "—"}</td>
                  <td className="py-3 text-right font-mono text-[11px] text-ink-dim">{c.wantsNewReleases ? "YES" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
