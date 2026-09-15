import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Private Edit" };

const STAGES = [
  { name: "Brief", copy: "You describe the idea. We ask what we need to ask." },
  { name: "Sculpting", copy: "Kent models it. You see it before it is printed." },
  { name: "Finalization", copy: "Approved, printed to your measurements, delivered." },
];

/**
 * Site map item 7. Deliberately has NO contact form: a commission requires an
 * account, and the details come from the profile.
 */
export default async function PrivateEditPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: mine } = user
    ? await supabase
        .from("commissions")
        .select("id, stage, brief, quoted_kes, created_at")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-5xl tracking-[0.15em]">PRIVATE EDIT</h1>
        <p className="mt-4 font-display text-2xl text-ink-dim">
          Your Idea + Our Craftsmanship
        </p>

        <ol className="mt-16 space-y-8">
          {STAGES.map((stage, i) => (
            <li key={stage.name} className="flex gap-6">
              <span className="font-mono text-[11px] text-ink-faint">0{i + 1}</span>
              <div>
                <h2 className="font-display text-2xl">{stage.name}</h2>
                <p className="mt-1 text-sm text-ink-dim">{stage.copy}</p>
              </div>
            </li>
          ))}
        </ol>

        {sent && (
          <p className="mt-16 border border-line bg-panel p-5 text-sm text-ink-dim">
            Your brief is with us. We will come back to you with questions and a price.
          </p>
        )}

        {mine && mine.length > 0 && (
          <section className="mt-16">
            <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">
              YOUR COMMISSIONS
            </h2>
            <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
              {mine.map((c) => (
                <li key={c.id} className="flex items-start gap-4 py-4">
                  <span className="w-28 font-mono text-[10px] tracking-[0.15em] text-ink-faint">
                    {c.stage.toUpperCase()}
                  </span>
                  <p className="flex-1 text-sm text-ink-dim line-clamp-2">{c.brief}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href={user ? "/private-edit/new" : "/sign-in?next=/private-edit/new"}
          className="mt-16 inline-block border border-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] hover:bg-ink hover:text-ground"
        >
          {user ? "START A COMMISSION" : "SIGN IN TO COMMISSION"}
        </Link>
        {!user && (
          <p className="mt-3 max-w-md text-sm text-ink-dim">
            A commission is printed to your measurements, so it starts from your account rather
            than a form.
          </p>
        )}
      </div>
    </div>
  );
}
