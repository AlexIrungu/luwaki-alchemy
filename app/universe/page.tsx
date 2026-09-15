import { createClient } from "@/lib/supabase/server";
import { HERO_SLUGS } from "@/lib/hero";
import { canMorph } from "@/lib/morph";
import { hasStill } from "@/lib/stills";
import { UniverseHero } from "@/components/universe/UniverseHero";
import { UniverseSteps } from "@/components/universe/UniverseSteps";

export const metadata = { title: "Universe" };

/** The design printed in the PRINT step — its waves read well as a wireframe. */
const PRINT_MODEL = "tidal-form";
/** How many designs the COLOR step morphs through as you scroll. */
const COLOR_DESIGNS = 5;

export default async function UniversePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug, name, unit_price_kes, collections(name)")
    .eq("is_published", true)
    .order("name")
    .returns<{ slug: string; name: string; unit_price_kes: number; collections: { name: string } | null }[]>();

  const withStills = (data ?? [])
    .filter((d) => hasStill(d.slug))
    .map((d) => ({ slug: d.slug, name: d.name, collection: d.collections?.name ?? null, priceKes: d.unit_price_kes }));
  // The most visible images draw from the hero set — the stills that render cleanly.
  const featured = (HERO_SLUGS as readonly string[]).flatMap((slug) => withStills.filter((d) => d.slug === slug));

  // The live nail: PRINT uses the first; COLOR morphs through all of them.
  const modelSlugs = [PRINT_MODEL, ...featured.map((d) => d.slug)]
    .filter((slug, i, all) => canMorph(slug) && all.indexOf(slug) === i)
    .slice(0, COLOR_DESIGNS);

  return (
    <>
      <UniverseHero designs={featured.slice(0, 6)} />
      <UniverseSteps designs={featured.length >= 5 ? featured : withStills} modelSlugs={modelSlugs} />
    </>
  );
}
