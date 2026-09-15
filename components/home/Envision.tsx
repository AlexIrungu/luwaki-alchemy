"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { HERO_SLUGS, heroSrc } from "@/lib/hero";

export type EnvisionDesign = { slug: string; name: string };

/**
 * DRAFT COPY — written from confirmed facts (modelled geometry, translucent
 * resin, printed to account measurements, monthly releases). Lucy owns the
 * brand voice; replace when she sends the ENVISION copy.
 */
const ROWS = [
  {
    word: "Sculpted",
    body: "Every design begins as geometry. The pattern is modelled into the nail itself — not printed onto it — so it catches light from every angle.",
    slug: "obscura-strata",
  },
  {
    word: "Printed",
    body: "Each nail is 3D-printed in translucent resin. Light moves through the shell and settles in the pattern beneath.",
    slug: "fractured-relic",
  },
  {
    word: "Made to measure",
    body: "Your set is printed to the ten widths on your account. Ten fingers, ten measurements, one set made for your hands.",
    slug: "tessella",
    href: "/account/measurements",
    cta: "ADD YOUR MEASUREMENTS",
  },
  {
    word: "Ever-expanding",
    body: "New designs arrive every month across SUBLIME, OPULENCE and NOIR.",
    slug: "butterfly-cove",
    href: "/collections",
    cta: "SEE THE COLLECTIONS",
  },
];

/**
 * Where each crossing still sits and how it moves. `speed` > 1 rises faster
 * and passes in front of the word; < 1 drifts behind it, smaller and dimmer —
 * the parallax difference is what reads as depth (vanguart ENVISION).
 */
const CROSSINGS = [
  { left: "8%", size: "clamp(7rem,15vw,15rem)", speed: 1.35, front: true },
  { left: "30%", size: "clamp(5rem,9vw,9rem)", speed: 0.7, front: false },
  { left: "56%", size: "clamp(8rem,17vw,17rem)", speed: 1.15, front: true },
  { left: "78%", size: "clamp(5rem,10vw,10rem)", speed: 0.8, front: false },
  { left: "18%", size: "clamp(5rem,8vw,8rem)", speed: 0.6, front: false },
  { left: "68%", size: "clamp(7rem,13vw,13rem)", speed: 1.45, front: true },
];

export function Envision({ designs }: { designs: EnvisionDesign[] }) {
  const stageRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  const available = new Set(designs.map((d) => d.slug));
  // The crossings are the most prominent images on the page, so they draw only
  // from the hero set — the stills that render cleanly.
  const pool = designs.filter((d) => (HERO_SLUGS as readonly string[]).includes(d.slug));
  const crossings = CROSSINGS.map((c, i) => ({ ...c, design: pool[i % Math.max(pool.length, 1)] })).filter(
    (c) => c.design,
  );
  const rows = ROWS.map((row) => ({ ...row, name: designs.find((d) => d.slug === row.slug)?.name })).filter((row) =>
    available.has(row.slug),
  );

  useEffect(() => {
    const stage = stageRef.current;
    const rowsEl = rowsRef.current;
    if (!stage || !rowsEl || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const images = gsap.utils.toArray<HTMLElement>("[data-cross]", stage);

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
      });

      tl.from("[data-envision-word]", { opacity: 0, scale: 0.92, duration: 0.12 }, 0);

      // Stills rise through the viewport while the word holds.
      images.forEach((img, i) => {
        const speed = Number(img.dataset.speed);
        tl.fromTo(
          img,
          { yPercent: 0, y: () => window.innerHeight * 0.65 },
          { y: () => -window.innerHeight * (0.65 + speed * 0.9), duration: 0.72 },
          0.04 + i * 0.03,
        );
      });

      // Then the word opens down the middle.
      tl.to("[data-envision-left]", { xPercent: -120, opacity: 0, duration: 0.22 }, 0.78)
        .to("[data-envision-right]", { xPercent: 120, opacity: 0, duration: 0.22 }, 0.78);

      // Rows ease in once, as each arrives.
      gsap.utils.toArray<HTMLElement>("[data-row]", rowsEl).forEach((row) => {
        gsap.from(row.querySelectorAll("[data-row-part]"), {
          opacity: 0,
          y: 60,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: row, start: "top 80%", once: true },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <section
        ref={stageRef}
        aria-label="Envision"
        className="relative h-[280vh] border-t border-line-soft motion-reduce:h-auto"
      >
        <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:py-32">
          <div className="absolute inset-0 flex items-center justify-center motion-reduce:static">
            <h2
              data-envision-word
              className="relative z-10 flex font-display text-[17vw] font-light leading-none tracking-[-0.04em]"
            >
              <span data-envision-left className="inline-block">
                ENVI
              </span>
              <span data-envision-right className="inline-block">
                SION
              </span>
            </h2>
          </div>

          {crossings.map((c, i) => (
            <Link
              key={`${c.design.slug}-${i}`}
              href={`/designs/${c.design.slug}`}
              aria-label={c.design.name}
              data-cross
              data-speed={c.speed}
              style={{ left: c.left, width: c.size }}
              className={`absolute top-0 block aspect-[3/4] overflow-hidden border border-line bg-panel motion-reduce:hidden ${
                c.front ? "z-20" : "z-0 opacity-60"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
              <img src={heroSrc(c.design.slug)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </Link>
          ))}
        </div>
      </section>

      <div ref={rowsRef} className="px-6 pb-32 md:px-10">
        <div className="mx-auto max-w-6xl space-y-32 md:space-y-48">
          {rows.map((row, i) => (
            <article
              key={row.word}
              data-row
              className="grid items-center gap-10 md:grid-cols-2 md:gap-20"
            >
              <div data-row-part className={i % 2 === 1 ? "md:order-2" : ""}>
                <p className="font-mono text-[11px] tracking-[0.3em] text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 font-display text-5xl font-light leading-tight md:text-7xl">{row.word}</h3>
                <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-dim md:text-base">{row.body}</p>
                {row.href && (
                  <Link
                    href={row.href}
                    className="mt-8 inline-block font-mono text-[11px] tracking-[0.25em] text-resin transition-colors hover:text-ink"
                  >
                    {row.cta} →
                  </Link>
                )}
              </div>

              <Link
                data-row-part
                href={`/designs/${row.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden border border-line bg-panel"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                <img
                  src={heroSrc(row.slug)}
                  alt={row.name ?? ""}
                  loading="lazy"
                  className="h-full w-full scale-125 object-cover transition-transform duration-700 group-hover:scale-[1.3]"
                />
                {row.name && (
                  <span className="absolute bottom-4 left-4 font-mono text-[10px] tracking-[0.25em] text-ink-dim">
                    {row.name.toUpperCase()}
                  </span>
                )}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
