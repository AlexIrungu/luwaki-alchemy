import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CommissionForm } from "@/components/CommissionForm";

export const metadata: Metadata = { title: "Start a commission" };

export default async function NewCommissionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { count: measured }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user!.id).single(),
    supabase.from("measurements").select("*", { count: "exact", head: true })
      .eq("profile_id", user!.id),
  ]);

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl tracking-[0.15em]">START A COMMISSION</h1>

        {/* No name/email/phone fields — this is the "no form" rule from the brief. */}
        <dl className="mt-10 grid gap-4 border border-line bg-panel p-5 font-mono text-[11px] sm:grid-cols-3">
          <div>
            <dt className="text-ink-faint">NAME</dt>
            <dd className="mt-1">{profile?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">PHONE</dt>
            <dd className="mt-1">{profile?.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">MEASUREMENTS</dt>
            <dd className={`mt-1 ${measured === 10 ? "" : "text-flag"}`}>
              {measured ?? 0} of 10
            </dd>
          </div>
        </dl>
        <p className="mt-3 font-mono text-[10px] text-ink-faint">
          Taken from your account. Change them under ACCOUNT.
        </p>

        <CommissionForm />
      </div>
    </div>
  );
}
