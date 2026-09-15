import { SocialFeed } from "@/components/SocialFeed";
import { Placeholder } from "@/components/ui/Section";
import { COLLECTION_ORDER, COLLECTION_VERB } from "@/lib/catalogue";

export default function HomePage() {
  return (
    <>
      <section className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-display text-6xl tracking-[0.3em] md:text-8xl">LUWAKI</h1>
          <p className="mt-6 font-mono text-[11px] tracking-[0.3em] text-ink-dim">ALCHEMY</p>
        </div>
      </section>

      <Placeholder
        phase={2}
        title="Hero morph"
        brief="Full-screen designs morphing into one another, plus the logo effect. Reference: generousbranding.com."
      />

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
