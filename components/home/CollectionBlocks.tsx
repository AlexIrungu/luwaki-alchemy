"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { heroSrc } from "@/lib/hero";

export type CollectionBlock = {
  slug: string;
  name: string;
  verb: string;
  designs: { slug: string; name: string }[];
};

// Literal class names so Tailwind generates them.
const ACCENT: Record<string, string> = {
  sublime: "text-sublime",
  opulence: "text-opulence",
  noir: "text-noir",
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * DREAM → SUBLIME, EMBODY → OPULENCE, CONJURE → NOIR (DESIGN.md §2).
 *
 * Each block is a tall section with a sticky stage. Scrolling through it:
 *   1. the numeral rolls up at the edge (rudlundschwarm.at)
 *   2. the verb rises letter by letter as a vertical stack, then lifts away
 *      (vanguart / wodniack)
 *   3. the collection name settles in, and its designs orbit it — passing in
 *      front of the letters on the near side, behind them on the far side
 *      (vanguart ENVISION + the brief's word-and-illustration pins)
 *
 * Reduced motion gets the composed end state as a plain section, via the
 * `motion-reduce:` variants — no JS, no layout flash.
 */
function Block({ block, index }: { block: CollectionBlock; index: number }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const digits = section.querySelectorAll("[data-digit]");
    const verbLetters = section.querySelectorAll("[data-verb-letter]");
    const name = section.querySelector("[data-name]");
    const cta = section.querySelector("[data-cta]");
    const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-orbit]"));

    let rx = 0;
    let ry = 0;
    const measure = () => {
      rx = Math.min(window.innerWidth * 0.38, 620);
      ry = window.innerHeight * 0.28;
    };
    measure();

    const orbit = (progress: number) => {
      const appear = clamp01((progress - 0.3) / 0.12);
      const spin = clamp01((progress - 0.3) / 0.7);
      cards.forEach((card, i) => {
        const angle = (i / cards.length) * Math.PI * 2 + spin * Math.PI * 1.25 - Math.PI / 2;
        const depth = Math.sin(angle); // +1 nearest the viewer, −1 furthest
        const near = (depth + 1) / 2;
        gsap.set(card, {
          x: Math.cos(angle) * rx,
          y: depth * ry,
          scale: 0.6 + near * 0.5,
          rotation: Math.cos(angle) * -8,
          opacity: appear * (0.45 + near * 0.55),
          zIndex: depth > 0 ? 20 : 0,
        });
      });
    };

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => orbit(self.progress),
            onRefresh: (self) => {
              measure();
              orbit(self.progress);
            },
          },
        })
        .from(digits, { yPercent: 110, stagger: 0.03, duration: 0.12 }, 0)
        .from(verbLetters, { yPercent: 140, opacity: 0, stagger: 0.015, duration: 0.1 }, 0.02)
        .to(verbLetters, { yPercent: -140, opacity: 0, stagger: 0.012, duration: 0.08 }, 0.22)
        .from(name, { opacity: 0, scale: 1.25, duration: 0.14 }, 0.28)
        .from(cta, { opacity: 0, y: 20, duration: 0.08 }, 0.4)
        .to({}, { duration: 0.52 }, 0.48);
    }, section);

    orbit(0);
    return () => ctx.revert();
  }, []);

  const numeral = String(index + 1).padStart(2, "0");
  const accent = ACCENT[block.slug] ?? "text-ink";

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`collection-${block.slug}`}
      className="relative h-[320vh] border-t border-line-soft motion-reduce:h-auto"
    >
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:py-32">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-[0.08em] right-4 flex font-display text-[40vh] font-light leading-none md:right-10 motion-reduce:static motion-reduce:justify-end motion-reduce:px-6 motion-reduce:text-[20vh] ${accent}`}
        >
          {numeral.split("").map((digit, i) => (
            <span key={i} className="inline-block overflow-hidden">
              <span data-digit className="inline-block">
                {digit}
              </span>
            </span>
          ))}
        </span>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:hidden"
        >
          <span className="flex flex-col items-center font-mono text-sm leading-[1.35] tracking-[0.3em] text-ink-dim md:text-base">
            {block.verb.split("").map((letter, i) => (
              <span key={i} className="block overflow-hidden">
                <span data-verb-letter className="block">
                  {letter}
                </span>
              </span>
            ))}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center motion-reduce:static motion-reduce:flex-col motion-reduce:gap-10 motion-reduce:px-6">
          <p className="hidden font-mono text-[11px] tracking-[0.3em] text-ink-dim motion-reduce:block">
            {block.verb}
          </p>

          <h2
            id={`collection-${block.slug}`}
            data-name
            className="relative z-10 font-display text-[14vw] font-light leading-none tracking-[-0.02em] lg:text-[11vw]"
          >
            {block.name}
          </h2>

          <ul className="contents motion-reduce:flex motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-4">
            {block.designs.map((design) => (
              <li
                key={design.slug}
                data-orbit
                className="absolute w-[clamp(6rem,12vw,12rem)] opacity-0 motion-reduce:relative motion-reduce:opacity-100"
              >
                <Link
                  href={`/designs/${design.slug}`}
                  aria-label={design.name}
                  className="block aspect-[3/4] overflow-hidden border border-line bg-panel"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- same static stills the hero shader reads; no remote optimisation needed */}
                  <img
                    src={heroSrc(design.slug)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          data-cta
          href={`/collections/${block.slug}`}
          className="absolute bottom-10 left-6 z-30 font-mono text-[11px] tracking-[0.25em] text-ink-dim transition-colors hover:text-ink md:left-10 motion-reduce:static motion-reduce:mt-12 motion-reduce:block motion-reduce:text-center"
        >
          {block.verb} → EXPLORE {block.name}
        </Link>
      </div>
    </section>
  );
}

export function CollectionBlocks({ blocks }: { blocks: CollectionBlock[] }) {
  // Pinned sections change the page height once images settle; re-measure.
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, []);

  return (
    <>
      {blocks.map((block, i) => (
        <Block key={block.slug} block={block} index={i} />
      ))}
    </>
  );
}
