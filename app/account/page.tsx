import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { count: measured }, { data: collections }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, preferred_collection, wants_new_releases")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("measurements")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user!.id),
    supabase.from("collections").select("id, name").order("sort_order"),
  ]);

  const complete = (measured ?? 0) === 10;

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-4xl tracking-[0.15em]">ACCOUNT</h1>
          <form action="/sign-out" method="post">
            <button className="font-mono text-[10px] tracking-[0.2em] text-ink-faint hover:text-ink-dim">
              SIGN OUT
            </button>
          </form>
        </div>
        <p className="mt-2 font-mono text-[11px] text-ink-faint">{user!.email}</p>

        {/* Sizing status is the first thing on the page: without it nothing ships. */}
        <Link
          href="/account/measurements"
          className={`mt-10 flex items-center justify-between border p-5 transition-colors ${
            complete ? "border-line hover:border-ink-faint" : "border-flag"
          }`}
        >
          <span>
            <span className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">
              MEASUREMENTS
            </span>
            <span className="mt-1 block text-sm">
              {complete
                ? "All ten nails on file."
                : `${measured ?? 0} of 10 recorded — required before you can order.`}
            </span>
          </span>
          <span className={`font-mono text-[11px] ${complete ? "text-ink-dim" : "text-flag"}`}>
            {complete ? "EDIT" : "ADD"}
          </span>
        </Link>

        <ProfileForm profile={profile!} collections={collections ?? []} />

        <nav className="mt-16 flex gap-8 font-mono text-[11px] tracking-[0.2em] text-ink-dim">
          <Link href="/account/orders" className="hover:text-ink">ORDERS</Link>
          <Link href="/private-edit" className="hover:text-ink">PRIVATE EDIT</Link>
        </nav>
      </div>
    </div>
  );
}
