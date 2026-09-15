import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Placeholder } from "@/components/ui/Section";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("collections")
    .select("slug, name, verb")
    .order("sort_order");

  return (
    <>
      <div className="px-6 pb-16 pt-40">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-5xl tracking-[0.2em]">COLLECTIONS</h1>
          <ul className="mt-12 space-y-6">
            {collections?.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="font-display text-3xl tracking-[0.2em] text-ink-dim transition-colors hover:text-ink"
                >
                  <span className="font-mono text-xs tracking-[0.3em] text-ink-faint">{c.verb}</span>{" "}
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Placeholder
        phase={2}
        title="Angled scroll grid"
        brief="Skewed grid (wodniack.dev). Clicking a design phases out the rest, rotates it upright and becomes the DESCRIPTION page."
      />
    </>
  );
}
