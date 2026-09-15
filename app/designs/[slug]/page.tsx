import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";
import { Placeholder } from "@/components/ui/Section";
import { AddToSet } from "@/components/AddToSet";
import type { Shape } from "@/lib/catalogue";
import { modelFor } from "@/lib/models";
import { DesignViewer } from "@/components/three/DesignViewer";

/**
 * Declared until `npm run db:types` has been run against the linked project.
 * Without generated types, supabase-js infers a to-one embed (`collections`)
 * as an array — PostgREST actually returns an object for a many-to-one.
 */
type DesignRow = {
  id: string;
  name: string;
  description: string | null;
  unit_price_kes: number;
  collections: { name: string } | null;
  product_variants: { id: string; options: { shape?: Shape }; price_kes: number | null }[];
  product_media: { url: string; alt: string | null; sort_order: number }[];
};

/** DESCRIPTION page — site map item 6. */
export default async function DesignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, unit_price_kes, collections(name), product_variants(id, options, price_kes), product_media(url, alt, sort_order)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single<DesignRow>();

  if (!product) notFound();

  const media = [...product.product_media].sort((a, b) => a.sort_order - b.sort_order);
  const model = modelFor(slug);

  return (
    <>
      <div className="px-6 pb-24 pt-40">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2">
          <div>
            {model ? (
              <DesignViewer slug={slug} designName={product.name} />
            ) : (
              <div className="relative aspect-square border border-line bg-panel">
                {media[0] && (
                  <Image
                    src={media[0].url}
                    alt={media[0].alt ?? product.name}
                    fill
                    priority
                    sizes="(min-width: 1024px) 36rem, 100vw"
                    className="object-contain"
                  />
                )}
              </div>
            )}
            {media.length > 0 && (
              <ul className="mt-6 grid grid-cols-5 gap-3">
                {media.map((m) => (
                  <li key={m.url} className="relative aspect-[4/5] border border-line bg-panel">
                    <Image src={m.url} alt={m.alt ?? product.name} fill sizes="7rem" className="object-cover" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-ink-faint">
              {product.collections?.name}
            </p>
            <h1 className="mt-3 font-display text-5xl">{product.name}</h1>
            <p className="mt-6 text-sm leading-relaxed text-ink-dim">{product.description}</p>

            <p className="mt-8 font-mono text-lg">
              {formatKES(product.unit_price_kes)}{" "}
              <span className="text-xs text-ink-dim">per nail</span>
            </p>

            <AddToSet
              productSlug={slug}
              productName={product.name}
              unitPriceKES={product.unit_price_kes}
              variants={product.product_variants}
            />
          </div>
        </div>
      </div>

      <Placeholder
        phase={2}
        title="Name effect"
        brief="The design name carries the STRATEGY logo effect on entry."
      />
    </>
  );
}
