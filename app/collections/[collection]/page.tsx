import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";
import { heroSrc } from "@/lib/hero";
import { hasStill } from "@/lib/stills";

type CollectionRow = {
  name: string;
  verb: string;
  products: {
    slug: string;
    name: string;
    unit_price_kes: number;
    is_published: boolean;
    product_media: { url: string; alt: string | null; sort_order: number }[];
  }[];
};

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("collections")
    .select("name, verb, products(slug, name, unit_price_kes, is_published, product_media(url, alt, sort_order))")
    .eq("slug", collection)
    .single<CollectionRow>();

  if (!data) notFound();

  const designs = data.products.filter((p) => p.is_published);

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs tracking-[0.3em] text-ink-faint">{data.verb}</p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.2em]">{data.name}</h1>

        {designs.length === 0 ? (
          <p className="mt-16 text-sm text-ink-dim">
            No designs published yet. Publish them from the admin dashboard.
          </p>
        ) : (
          <ul className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((p) => {
              // The dark still matches the rest of the site; the client's render
              // (white backdrop) stands in until a still has been rendered.
              const media = [...p.product_media].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <li key={p.slug}>
                  <Link href={`/designs/${p.slug}`} className="group block">
                    <div className="relative aspect-[3/4] overflow-hidden border border-line bg-panel">
                      {hasStill(p.slug) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader
                        <img
                          src={heroSrc(p.slug)}
                          alt={p.name}
                          loading="lazy"
                          className="h-full w-full scale-125 object-cover transition-transform duration-700 group-hover:scale-[1.35]"
                        />
                      ) : media ? (
                        <Image
                          src={media.url}
                          alt={media.alt ?? p.name}
                          fill
                          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <p className="mt-3 font-display text-xl">{p.name}</p>
                    {/* Per-nail pricing — say so, or the number reads as a set price. */}
                    <p className="font-mono text-xs text-ink-dim">
                      {formatKES(p.unit_price_kes)} per nail
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
