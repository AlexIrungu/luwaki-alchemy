"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { heroSrc } from "@/lib/hero";

export type FloatingDesign = { slug: string; name: string };

/** Where each floating still sits; `depth` scales how far it follows the pointer. */
const SPOTS = [
  { left: "7%", top: "14%", width: "clamp(6rem,11vw,11rem)", depth: 0.6 },
  { left: "79%", top: "9%", width: "clamp(5rem,8vw,8rem)", depth: 0.3 },
  { left: "71%", top: "60%", width: "clamp(7rem,13vw,13rem)", depth: 0.9 },
  { left: "13%", top: "63%", width: "clamp(5rem,9vw,9rem)", depth: 0.4 },
  { left: "43%", top: "5%", width: "clamp(4rem,6vw,6rem)", depth: 0.2 },
  { left: "47%", top: "76%", width: "clamp(4rem,7vw,7rem)", depth: 0.5 },
];

const WORD = "LUWAKI";

/**
 * UNIVERSE hero (DESIGN.md §6, after duten mue-concept): the wordmark floating
 * at the centre with a COLLECTIONS anchor, designs drifting around it and
 * leaning away from the pointer, over the reference's faint grid and
 * circle-lattice line work.
 */
export function UniverseHero({ designs }: { designs: FloatingDesign[] }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-hero-letter]", { yPercent: 110, opacity: 0, stagger: 0.06, duration: 1.1, ease: "power4.out" });

      const floats = gsap.utils.toArray<HTMLElement>("[data-float]");
      floats.forEach((float, i) => {
        gsap.from(float, { opacity: 0, scale: 0.8, duration: 1.2, delay: 0.4 + i * 0.08, ease: "power3.out" });
        gsap.to(float.firstElementChild, {
          y: gsap.utils.random(-24, 24),
          rotation: gsap.utils.random(-6, 6),
          duration: gsap.utils.random(3, 5),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.2,
        });
      });

      const movers = floats.map((float) => ({
        x: gsap.quickTo(float, "x", { duration: 1, ease: "power3" }),
        y: gsap.quickTo(float, "y", { duration: 1, ease: "power3" }),
        depth: Number(float.dataset.depth),
      }));
      const onMove = (event: PointerEvent) => {
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;
        movers.forEach((m) => {
          m.x(-nx * 80 * m.depth);
          m.y(-ny * 60 * m.depth);
        });
      };
      window.addEventListener("pointermove", onMove);

      gsap.to("[data-hero-word]", {
        yPercent: -30,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });

      return () => window.removeEventListener("pointermove", onMove);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="relative flex h-svh items-center justify-center overflow-hidden">
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -left-24 -top-20 size-[34rem] -rotate-12 text-line"
      >
        <defs>
          <pattern id="universe-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#universe-grid)" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -bottom-28 -right-20 size-[30rem] rotate-12 text-line"
      >
        <defs>
          <pattern id="universe-rings" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="11" cy="11" r="9.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#universe-rings)" />
      </svg>

      {SPOTS.map((spot, i) => {
        const design = designs[i];
        if (!design) return null;
        return (
          <div
            key={design.slug}
            data-float
            data-depth={spot.depth}
            style={{ left: spot.left, top: spot.top, width: spot.width }}
            className="absolute"
          >
            <Link
              href={`/designs/${design.slug}`}
              aria-label={design.name}
              className="block aspect-[3/4] overflow-hidden border border-line bg-panel"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
              <img src={heroSrc(design.slug)} alt="" className="h-full w-full scale-125 object-cover" />
            </Link>
          </div>
        );
      })}

      <div data-hero-word className="relative z-10 text-center">
        <p className="font-mono text-[11px] tracking-[0.4em] text-ink-dim">UNIVERSE</p>
        <h1
          aria-label={WORD}
          className="mt-6 flex overflow-hidden font-display text-[16vw] font-light leading-none tracking-[0.12em]"
        >
          {WORD.split("").map((letter, i) => (
            <span key={i} data-hero-letter aria-hidden="true" className="inline-block">
              {letter}
            </span>
          ))}
        </h1>
        <Link
          href="/collections"
          className="mt-10 inline-block font-mono text-[11px] tracking-[0.3em] text-ink-dim transition-colors hover:text-ink"
        >
          COLLECTIONS ↓
        </Link>
      </div>
    </section>
  );
}
