import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MeasurementsForm } from "@/components/MeasurementsForm";

export const metadata: Metadata = { title: "Measurements" };

/**
 * The most important form on the site. A wrong number here produces an
 * unwearable set, so it is a guided flow with bounds — never a free-text field.
 */
export default async function MeasurementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("measurements")
    .select("hand, finger, width_mm")
    .eq("profile_id", user!.id);

  const existing = Object.fromEntries(
    (rows ?? []).map((r) => [`${r.hand}-${r.finger}`, Number(r.width_mm)]),
  );

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl tracking-[0.15em]">YOUR MEASUREMENTS</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-dim">
          Every LUWAKI set is printed for one pair of hands. Measure the widest point of each
          nail bed in millimetres and record all ten — we cannot produce an order without them.
        </p>
        <MeasurementsForm existing={existing} />
      </div>
    </div>
  );
}
