import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("collections")
    .select("name, verb, products(slug, name, unit_price_kes)")
    .eq("slug", collection)
    .single();

  if (!data) notFound();

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs tracking-[0.3em] text-ink-faint">{data.verb}</p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.2em]">{data.name}</h1>

        {data.products.length === 0 ? (
          <p className="mt-16 text-sm text-ink-dim">
            No designs published yet. Publish them from the admin dashboard.
          </p>
        ) : (
          <ul className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {data.products.map((p) => (
              <li key={p.slug}>
                <Link href={`/designs/${p.slug}`} className="block">
                  <div className="aspect-[3/4] bg-panel" />
                  <p className="mt-3 font-display text-xl">{p.name}</p>
                  {/* Per-nail pricing — say so, or the number reads as a set price. */}
                  <p className="font-mono text-xs text-ink-dim">
                    {formatKES(p.unit_price_kes)} per nail
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
