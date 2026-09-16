import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { SetInProgress } from "@/components/account/SetInProgress";
import { HandsDiagram } from "@/components/account/HandsDiagram";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { formatKES } from "@/lib/money";

export const metadata: Metadata = { title: "Account" };

type OrderRow = {
  id: string;
  reference: string;
  status: string;
  total_kes: number;
  created_at: string;
  courier: string | null;
  tracking_ref: string | null;
  order_items: { count: number }[];
};

type CommissionRow = { id: string; stage: string; brief: string; quoted_kes: number | null; created_at: string };

/** Orders still on their way to the customer. */
const ACTIVE = ["paid", "in_production", "shipped"];
const COMMISSION_STAGES = ["brief", "sculpting", "finalization", "complete"];

const date = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const actionLink = "font-mono text-[10px] tracking-[0.2em] text-ink-dim hover:text-ink";

/**
 * The signed-in customer's home, ordered by urgency: what blocks them, the set
 * they're building, the order on its way, then everything else.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: measurements }, { data: orders }, { data: commissions }, { data: collections }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, preferred_collection, wants_new_releases, role")
        .eq("id", user!.id)
        .single(),
      supabase.from("measurements").select("hand, finger").eq("profile_id", user!.id),
      supabase
        .from("orders")
        .select("id, reference, status, total_kes, created_at, courier, tracking_ref, order_items(count)")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false })
        .returns<OrderRow[]>(),
      supabase
        .from("commissions")
        .select("id, stage, brief, quoted_kes, created_at")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false })
        .returns<CommissionRow[]>(),
      supabase.from("collections").select("id, name").order("sort_order"),
    ]);

  const measured = new Set((measurements ?? []).map((m) => `${m.hand}-${m.finger}`));
  const complete = measured.size === 10;
  const unpaid = (orders ?? []).filter((o) => o.status === "pending_payment");
  const active = (orders ?? []).filter((o) => ACTIVE.includes(o.status));
  const past = (orders ?? []).filter((o) => !ACTIVE.includes(o.status) && o.status !== "pending_payment");
  const quoted = (commissions ?? []).filter((c) => c.quoted_kes !== null && c.stage === "brief");
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  const alerts = [
    !complete && {
      key: "measurements",
      text: `${measured.size} of 10 fingers measured — we can't print an order without all ten.`,
      href: "/account/measurements",
      cta: "ADD",
    },
    ...unpaid.map((o) => ({
      key: o.id,
      text: `Order ${o.reference} is awaiting payment. If you've paid, it updates within a few minutes.`,
      href: "/contact",
      cta: "HELP",
    })),
    ...quoted.map((c) => ({
      key: c.id,
      text: `Your Private Edit quote is ready: ${formatKES(c.quoted_kes!)}.`,
      href: "/private-edit",
      cta: "VIEW",
    })),
  ].filter((a): a is { key: string; text: string; href: string; cta: string } => Boolean(a));

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-display text-4xl sm:text-5xl">{firstName ? `Welcome back, ${firstName}` : "Your account"}</h1>
          <div className="flex items-baseline gap-6">
            {/* Only admins see the way in; /admin is guarded by the proxy and RLS regardless. */}
            {profile?.role === "admin" && (
              <Link href="/admin" className="font-mono text-[10px] tracking-[0.2em] text-resin hover:text-ink">
                ADMIN →
              </Link>
            )}
            <form action="/sign-out" method="post">
              <button className="font-mono text-[10px] tracking-[0.2em] text-ink-faint hover:text-ink-dim">SIGN OUT</button>
            </form>
          </div>
        </div>
        <p className="mt-2 font-mono text-[11px] text-ink-faint">{user!.email}</p>

        {alerts.length > 0 && (
          <ul className="mt-10 space-y-2">
            {alerts.map((alert) => (
              <li key={alert.key}>
                <Link
                  href={alert.href}
                  className="flex items-center justify-between gap-4 border border-flag p-4 text-sm transition-colors hover:bg-panel"
                >
                  <span>{alert.text}</span>
                  <span className="font-mono text-[11px] tracking-[0.15em] text-flag">{alert.cta} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Section title="YOUR SET">
          <SetInProgress />
        </Section>

        {active.length > 0 && (
          <Section title={active.length > 1 ? "ORDERS ON THEIR WAY" : "YOUR ORDER"}>
            <ul className="space-y-4">
              {active.map((order) => (
                <li key={order.id} className="border border-line p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px]">{order.reference}</span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {date(order.created_at)} · {order.order_items[0]?.count ?? 0} NAILS · {formatKES(order.total_kes)}
                    </span>
                  </div>
                  <div className="mt-5">
                    <OrderTimeline status={order.status} />
                  </div>
                  {order.status === "shipped" && order.courier && (
                    <p className="mt-4 font-mono text-[11px] text-resin">
                      With {order.courier}
                      {order.tracking_ref && ` · tracking ${order.tracking_ref}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {past.length > 0 && (
          <Section
            title="PAST ORDERS"
            action={
              <Link href="/account/orders" className={actionLink}>
                ALL ORDERS →
              </Link>
            }
          >
            <ul className="divide-y divide-line-soft border-y border-line-soft">
              {past.slice(0, 3).map((order) => (
                <li key={order.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                  <span className="font-mono text-[11px]">{order.reference}</span>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {date(order.created_at)} · {order.status.replace("_", " ").toUpperCase()} · {formatKES(order.total_kes)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section
          title="MEASUREMENTS"
          action={
            <Link href="/account/measurements" className={actionLink}>
              {complete ? "EDIT →" : "ADD →"}
            </Link>
          }
        >
          <div className="flex flex-wrap items-end justify-between gap-6 border border-line p-6">
            <HandsDiagram measured={measured} />
            <p className="text-sm text-ink-dim">
              {complete ? "All ten nails on file." : `${measured.size} of 10 recorded — required before you can order.`}
            </p>
          </div>
        </Section>

        <Section
          title="PRIVATE EDIT"
          action={
            <Link href="/private-edit" className={actionLink}>
              {commissions?.length ? "COMMISSIONS →" : "COMMISSION A DESIGN →"}
            </Link>
          }
        >
          {commissions?.length ? (
            <ul className="space-y-4">
              {commissions.map((c) => {
                const reached = COMMISSION_STAGES.indexOf(c.stage);
                return (
                  <li key={c.id} className="border border-line p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="line-clamp-1 max-w-md text-sm">{c.brief}</p>
                      <span className="font-mono text-[10px] text-ink-faint">
                        {date(c.created_at)}
                        {c.quoted_kes !== null && ` · QUOTE ${formatKES(c.quoted_kes)}`}
                      </span>
                    </div>
                    {c.stage === "declined" ? (
                      <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-ink-faint">DECLINED</p>
                    ) : (
                      <ol className="mt-5 grid grid-cols-4 gap-2">
                        {COMMISSION_STAGES.map((stage, i) => (
                          <li key={stage}>
                            <span className={`block h-1 ${reached >= i ? "bg-resin" : "bg-line"}`} />
                            <span
                              className={`mt-2 block font-mono text-[9px] tracking-[0.2em] ${
                                i === reached ? "text-ink" : reached > i ? "text-ink-dim" : "text-ink-faint"
                              }`}
                            >
                              {stage.toUpperCase()}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-dim">A design of your own, sculpted by Kent and printed to your measurements.</p>
          )}
        </Section>

        <Section title="PROFILE">
          <ProfileForm profile={profile!} collections={collections ?? []} />
        </Section>
      </div>
    </div>
  );
}
