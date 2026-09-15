import { SocialFeed } from "@/components/SocialFeed";
import { HeroMorph, type HeroSlide } from "@/components/home/HeroMorph";
import { Placeholder } from "@/components/ui/Section";
import { COLLECTION_ORDER, COLLECTION_VERB } from "@/lib/catalogue";
import { HERO_SLUGS } from "@/lib/hero";
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

  return (
    <>
      <HeroMorph slides={slides} />

      {COLLECTION_ORDER.map((slug) => (
        <Placeholder
          key={slug}
          phase={2}
          title={`${COLLECTION_VERB[slug]} → ${slug.toUpperCase()}`}
          brief="Vertical letter-stack and numbers effect (rudlundschwarm.at), with images orbiting the word (vanguart ENVISION)."
        />
      ))}

      <Placeholder
        phase={2}
        title="ENVISION"
        brief="Scroll-pinned section, then four alternating WORDS/PICTURE rows. Excludes vanguart's 'EXPLORING THE FUTURE' block."
      />

      <SocialFeed />
    </>
  );
}
