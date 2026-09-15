import { createClient } from "@/lib/supabase/server";
import { HERO_SLUGS } from "@/lib/hero";
import { modelFor } from "@/lib/models";
import { hasStill } from "@/lib/stills";
import { UniverseHero } from "@/components/universe/UniverseHero";
import { UniverseSteps } from "@/components/universe/UniverseSteps";

export const metadata = { title: "Universe" };

/** The design printed in the PRINT step — light, and its waves read well as a wireframe. */
const PRINT_MODEL = "tidal-form";

export default async function UniversePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug, name")
    .eq("is_published", true)
    .order("name")
    .returns<{ slug: string; name: string }[]>();

  const withStills = (data ?? []).filter((d) => hasStill(d.slug));
  // The most visible images draw from the hero set — the stills that render cleanly.
  const featured = (HERO_SLUGS as readonly string[]).flatMap((slug) => withStills.filter((d) => d.slug === slug));

  return (
    <>
      <UniverseHero designs={featured.slice(0, 6)} />
      <UniverseSteps
        designs={featured.length >= 5 ? featured : withStills}
        modelSlug={modelFor(PRINT_MODEL) ? PRINT_MODEL : null}
      />
    </>
  );
}
