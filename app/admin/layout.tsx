import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  // Protected by the proxy and RLS, but it should never be indexed either.
  robots: { index: false, follow: false },
};

/** The admin's own shell — no storefront header, footer or smooth scroll. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [produce, briefs, unread] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "in_production"]),
    supabase.from("commissions").select("*", { count: "exact", head: true }).eq("stage", "brief"),
    supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("handled", false),
  ]);

  return (
    <div className="min-h-screen bg-ground font-sans tabular-nums lg:flex">
      <AdminNav
        items={[
          { href: "/admin", label: "OVERVIEW" },
          { href: "/admin/orders", label: "ORDERS", badge: produce.count ?? 0 },
          { href: "/admin/products", label: "DESIGNS" },
          { href: "/admin/commissions", label: "PRIVATE EDIT", badge: briefs.count ?? 0 },
          { href: "/admin/messages", label: "MESSAGES", badge: unread.count ?? 0 },
          { href: "/admin/customers", label: "CUSTOMERS" },
        ]}
      />
      <div className="min-w-0 flex-1 px-4 pb-24 pt-2 sm:px-8 lg:px-12 lg:pt-6 print:p-0">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
