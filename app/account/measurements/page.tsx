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

        <details className="mt-8 border border-line bg-panel p-5 text-sm leading-relaxed text-ink-dim open:pb-6">
          <summary className="cursor-pointer font-mono text-[11px] tracking-[0.25em] text-ink">
            HOW TO MEASURE
          </summary>
          <p className="mt-4">You need clear tape, a pen and a millimetre ruler.</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Lay a strip of clear tape across the nail.</li>
            <li>Mark both edges of the nail at its widest point, where it meets the skin.</li>
            <li>Peel the tape off, stick it on the ruler and read the distance between the marks.</li>
            <li>Repeat for all ten fingers. Round to the nearest half millimetre.</li>
          </ol>
          <p className="mt-4 text-ink-faint">
            As a rough check, thumbs usually measure 14–18 mm and pinkies 7–10 mm. If every
            finger reads the same, measure again.
          </p>
        </details>

        <MeasurementsForm existing={existing} />
      </div>
    </div>
  );
}
