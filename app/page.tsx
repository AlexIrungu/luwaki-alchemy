import { SocialFeed } from "@/components/SocialFeed";
import { HeroMorph, type HeroSlide } from "@/components/home/HeroMorph";
import { CollectionBlocks, type CollectionBlock } from "@/components/home/CollectionBlocks";
import { Envision } from "@/components/home/Envision";
import { HERO_SLUGS } from "@/lib/hero";
import { hasStill } from "@/lib/stills";
import { canMorph } from "@/lib/morph";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: designs } = await supabase
    .from("products")
    .select("slug, name, collections(name)")
    .in("slug", [...HERO_SLUGS])
    .eq("is_published", true)
    .returns<{ slug: string; name: string; collections: { name: string } | null }[]>();

  // Hero order comes from lib/hero.ts; only published designs appear, so every
  // caption links to a page that exists.
  const slides: HeroSlide[] = HERO_SLUGS.flatMap((slug) => {
    const design = designs?.find((d) => d.slug === slug);
    return design ? [{ slug, name: design.name, collection: design.collections?.name ?? null }] : [];
  });

  const { data: collections } = await supabase
    .from("collections")
    .select("slug, name, verb, products(slug, name, is_published)")
    .order("sort_order")
    .returns<{ slug: string; name: string; verb: string; products: { slug: string; name: string; is_published: boolean }[] }[]>();

  // Only published designs, and only those with a rendered still to orbit.
  const blocks: CollectionBlock[] = (collections ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    verb: c.verb,
    designs: c.products.filter((d) => d.is_published && hasStill(d.slug)).map(({ slug, name }) => ({ slug, name })),
  }));

  // The set of ten draws on every published design that has baked morph maps.
  const setDesigns: HeroSlide[] = (collections ?? []).flatMap((c) =>
    c.products
      .filter((d) => d.is_published && canMorph(d.slug))
      .map((d) => ({ slug: d.slug, name: d.name, collection: c.name })),
  );

  return (
    <>
      <HeroMorph slides={slides} setDesigns={setDesigns} />
      <CollectionBlocks blocks={blocks} />
      <Envision designs={blocks.flatMap((b) => b.designs)} />

      <SocialFeed />
    </>
  );
}
