import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const [published, awaitingProduction, commissions, messages] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("orders").select("*", { count: "exact", head: true })
      .in("status", ["paid", "in_production"]),
    supabase.from("commissions").select("*", { count: "exact", head: true }).eq("stage", "brief"),
    supabase.from("contact_messages").select("*", { count: "exact", head: true })
      .eq("handled", false),
  ]);

  const stats = [
    { label: "PUBLISHED", value: published.count ?? 0, href: "/admin/products" },
    { label: "TO PRODUCE", value: awaitingProduction.count ?? 0, href: "/admin/orders" },
    { label: "NEW BRIEFS", value: commissions.count ?? 0, href: "/admin/commissions" },
    { label: "UNREAD", value: messages.count ?? 0, href: "/admin/messages" },
  ];

  return (
    <div className="mt-12">
      <h1 className="font-display text-4xl tracking-[0.15em]">OVERVIEW</h1>
      <dl className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-ground p-6 hover:bg-panel">
            <dt className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">{s.label}</dt>
            <dd className="mt-2 font-display text-4xl">{s.value}</dd>
          </Link>
        ))}
      </dl>
    </div>
  );
}
