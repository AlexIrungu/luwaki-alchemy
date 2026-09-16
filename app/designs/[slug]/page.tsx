import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";
import { AddToSet } from "@/components/AddToSet";
import { DesignName } from "@/components/DesignName";
import { SHAPES, type Shape } from "@/lib/catalogue";
import { modelFor } from "@/lib/models";
import { heroSrc } from "@/lib/hero";
import { hasStill, shapeStills } from "@/lib/stills";
import { DesignViewer } from "@/components/three/DesignViewer";
import { DesignShapeProvider } from "@/components/DesignShape";
import { ShapeStrip } from "@/components/ShapeStrip";

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
  collection_id: string | null;
  collections: { name: string; slug: string } | null;
  product_variants: { id: string; options: { shape?: Shape }; price_kes: number | null }[];
  product_media: { url: string; alt: string | null; sort_order: number }[];
};

/**
 * DESCRIPTION page — site map item 6, laid out after rudlundschwarm's
 * "Was wir tun": a giant numeral at the page edge, an animated character (the
 * live nail), the name on a marker bar, a big tagline over an airy body, and
 * short thick rules between the parts.
 */
export default async function DesignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, description, unit_price_kes, collection_id, collections(name, slug), product_variants(id, options, price_kes), product_media(url, alt, sort_order)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single<DesignRow>();

  if (!product) notFound();

  // The numeral is the design's place in its collection.
  const { data: siblings } = product.collection_id
    ? await supabase
        .from("products")
        .select("id")
        .eq("collection_id", product.collection_id)
        .eq("is_published", true)
        .order("name")
    : { data: null };
  const position = Math.max(1, (siblings ?? []).findIndex((s) => s.id === product.id) + 1);
  const numeralLeft = position % 2 === 1;

  const media = [...product.product_media].sort((a, b) => a.sort_order - b.sort_order);
  const model = modelFor(slug);
  const delivered = SHAPES.filter((s) => model?.shapes[s]);
  const sold = SHAPES.filter((s) => product.product_variants.some((v) => v.options.shape === s));
  const still = hasStill(slug) ? heroSrc(slug) : (media[0]?.url ?? null);

  // Descriptions are still to come from Lucy: the first sentence becomes the tagline.
  const description = product.description?.trim() ?? "";
  const split = description.search(/[.!?](\s|$)/);
  const tagline = split === -1 ? description : description.slice(0, split + 1);
  const body = split === -1 ? "" : description.slice(split + 1).trim();

  return (
    <DesignShapeProvider shapes={sold} delivered={delivered}>
      <div className="relative overflow-hidden px-6 pb-32 pt-36">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-40 select-none font-display text-[20rem] leading-none text-ink/[0.07] lg:top-24 lg:text-[36rem] ${
            numeralLeft ? "-left-[0.12em]" : "-right-[0.08em]"
          }`}
        >
          {position}
        </span>

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
          <div className={numeralLeft ? "" : "lg:order-2"}>
            <span aria-hidden="true" className="mx-auto block h-2 w-32 bg-ink" />
            <div className="mt-6">
              {model ? (
                <DesignViewer slug={slug} designName={product.name} bare />
              ) : (
                still && (
                  <div className="relative aspect-square">
                    <Image src={still} alt={product.name} fill priority sizes="(min-width: 1024px) 36rem, 100vw" className="object-contain" />
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-ink-faint">
              N° {String(position).padStart(2, "0")} — {product.collections?.name ?? "LUWAKI ALCHEMY"}
            </p>
            <DesignName name={product.name} collection={product.collections?.slug ?? null} />

            {description ? (
              <>
                <p className="mt-10 font-display text-3xl leading-snug sm:text-4xl">{tagline}</p>
                {body && <p className="mt-6 text-lg leading-relaxed text-ink-dim">{body}</p>}
              </>
            ) : (
              // DRAFT COPY — placeholder until Lucy sends a tagline and paragraph per design.
              <>
                <p className="mt-10 font-display text-3xl leading-snug sm:text-4xl">
                  Printed in resin, one layer at a time.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-ink-dim">
                  Every nail is made to order from the measurements on your account, so it fits the finger it was
                  printed for. Pick a shape, choose the finger, and build the set one nail at a time.
                </p>
                <p className="mt-3 font-mono text-[9px] tracking-[0.25em] text-flag">DRAFT COPY — FOR LUCY</p>
              </>
            )}

            <span aria-hidden="true" className="mt-12 block h-1.5 w-20 bg-ink" />

            <p className="mt-8 font-mono text-2xl">
              {formatKES(product.unit_price_kes)}{" "}
              <span className="text-xs tracking-[0.15em] text-ink-dim">PER NAIL · EXCL. VAT</span>
            </p>

            <AddToSet
              productSlug={slug}
              productName={product.name}
              unitPriceKES={product.unit_price_kes}
              variants={product.product_variants}
            />
          </div>
        </div>

        <section className="relative mx-auto mt-32 max-w-6xl">
          <span aria-hidden="true" className="block h-1.5 w-20 bg-ink" />
          <h2 className="mt-6 font-display text-4xl">Five shapes</h2>
          <ShapeStrip designName={product.name} stills={shapeStills(slug, delivered)} />
        </section>
      </div>
    </DesignShapeProvider>
  );
}
