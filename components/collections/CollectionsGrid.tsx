"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { heroSrc } from "@/lib/hero";

export type GridCollection = {
  slug: string;
  name: string;
  verb: string;
  designs: { slug: string; name: string }[];
};

const ROW_TEXT: Record<string, string> = {
  sublime: "text-sublime/20",
  opulence: "text-opulence/20",
  noir: "text-noir/40",
};

const TITLE = "COLLECTIONS";

/**
 * The COLLECTIONS page (DESIGN.md §4, after wodniack.dev's WORK section).
 *
 * One pinned stage:
 *   1. the title stands one letter per line inside an arch, which then expands
 *      past the viewport and reveals the grid behind it
 *   2. a plane tilted in perspective carries one row per collection — the name
 *      repeated in huge faint type — sliding in alternating directions, with
 *      that collection's designs riding along as tilted cards
 * Clicking a card fades the rest, lifts the card upright to the centre, and
 * then routes to its DESCRIPTION page.
 */
export function CollectionsGrid({ collections }: { collections: GridCollection[] }) {
  const stageRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: true },
      });

      tl.from("[data-arch-letter]", { yPercent: 100, opacity: 0, stagger: 0.008, duration: 0.06 }, 0)
        .to("[data-arch]", { scale: 9, duration: 0.2, ease: "power2.in" }, 0.1)
        .to("[data-arch-letters]", { opacity: 0, duration: 0.06 }, 0.1)
        .to("[data-arch]", { opacity: 0, duration: 0.05 }, 0.25)
        .from("[data-plane]", { opacity: 0, scale: 1.15, duration: 0.15 }, 0.16);

      gsap.utils.toArray<HTMLElement>("[data-row]", stage).forEach((row, i) => {
        const [from, to] = i % 2 === 0 ? [0, -38] : [-38, 0];
        tl.fromTo(row, { xPercent: from }, { xPercent: to, duration: 0.84 }, 0.16);
      });
    }, stage);

    return () => ctx.revert();
  }, []);

  const open = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (prefersReducedMotion() || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();

    const card = event.currentTarget;
    const img = card.querySelector("img");
    const rect = card.getBoundingClientRect();
    if (!img) return router.push(`/designs/${slug}`);

    // The card sits inside a 3D-transformed plane, so it can't be animated out
    // of it cleanly. A fixed clone takes over at the card's on-screen box and
    // makes the move instead.
    const clone = img.cloneNode(true) as HTMLImageElement;
    Object.assign(clone.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      objectFit: "cover",
      zIndex: "100",
      pointerEvents: "none",
    });
    document.body.appendChild(clone);
    card.style.visibility = "hidden";

    const height = Math.min(window.innerHeight * 0.72, 640);
    const width = height * 0.75;

    gsap
      .timeline({
        onComplete: () => {
          router.push(`/designs/${slug}`);
          window.setTimeout(() => clone.remove(), 700);
        },
      })
      .to("[data-plane]", { opacity: 0, duration: 0.45, ease: "power2.out" }, 0)
      .fromTo(
        clone,
        { rotation: -9 },
        {
          left: (window.innerWidth - width) / 2,
          top: (window.innerHeight - height) / 2,
          width,
          height,
          rotation: 0,
          duration: 0.8,
          ease: "power3.inOut",
        },
        0.05,
      );
  };

  return (
    <>
      <section
        ref={stageRef}
        aria-labelledby="collections-title"
        className="relative h-[420vh] motion-reduce:h-auto"
      >
        <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto">
          {/* The tilted plane of rows. */}
          <div className="absolute inset-0 flex items-center justify-center motion-reduce:hidden [perspective:1400px]">
            <div
              data-plane
              className="flex w-full flex-col gap-[6vh] [transform:rotateX(26deg)_rotateZ(-9deg)_scale(1.35)]"
            >
              {collections.map((collection) => (
                <div key={collection.slug} data-row className="relative w-max whitespace-nowrap">
                  <Link
                    href={`/collections/${collection.slug}`}
                    className={`font-display text-[15vw] font-light leading-none tracking-[-0.03em] ${
                      ROW_TEXT[collection.slug] ?? "text-ink/20"
                    }`}
                  >
                    {Array.from({ length: 5 }, () => collection.name).join(" · ")}
                  </Link>

                  {collection.designs.map((design, i) => (
                    <Link
                      key={design.slug}
                      href={`/designs/${design.slug}`}
                      aria-label={`${design.name}, ${collection.name}`}
                      onClick={(event) => open(event, design.slug)}
                      style={{ left: `${14 + i * 15}%`, top: i % 2 === 0 ? "-18%" : "22%" }}
                      className="group absolute block w-[clamp(7rem,11vw,11rem)] rotate-[-4deg] transition-transform duration-500 hover:rotate-0 hover:scale-110"
                    >
                      <span className="block aspect-[3/4] overflow-hidden border border-line bg-panel">
                        {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                        <img
                          src={heroSrc(design.slug)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full scale-125 object-cover"
                        />
                      </span>
                      <span className="mt-2 block font-mono text-[10px] tracking-[0.25em] text-ink-dim opacity-0 transition-opacity group-hover:opacity-100">
                        {design.name.toUpperCase()}
                      </span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* The arch intro. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:static motion-reduce:pt-40">
            <div
              data-arch
              className="flex h-[78vh] w-[min(15rem,40vw)] items-start justify-center rounded-t-full border border-line bg-panel pt-[16vh] motion-reduce:h-auto motion-reduce:w-auto motion-reduce:border-0 motion-reduce:bg-transparent motion-reduce:pt-0"
            >
              <h1
                id="collections-title"
                data-arch-letters
                aria-label={TITLE}
                className="flex flex-col items-center font-display text-3xl leading-[1.05] md:text-4xl motion-reduce:flex-row motion-reduce:text-5xl motion-reduce:tracking-[0.2em]"
              >
                {TITLE.split("").map((letter, i) => (
                  <span key={i} aria-hidden="true" className="block overflow-hidden">
                    <span data-arch-letter className="block">
                      {letter}
                    </span>
                  </span>
                ))}
              </h1>
            </div>
          </div>

          {/* Reduced motion: the same catalogue as a plain grid. */}
          <div className="hidden px-6 pb-24 pt-16 motion-reduce:block">
            <div className="mx-auto max-w-6xl space-y-20">
              {collections.map((collection) => (
                <div key={collection.slug}>
                  <Link href={`/collections/${collection.slug}`} className="font-display text-4xl tracking-[0.15em]">
                    <span className="font-mono text-xs tracking-[0.3em] text-ink-faint">{collection.verb}</span>{" "}
                    {collection.name}
                  </Link>
                  <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {collection.designs.map((design) => (
                      <li key={design.slug}>
                        <Link href={`/designs/${design.slug}`} className="block">
                          <span className="block aspect-[3/4] overflow-hidden border border-line bg-panel">
                            {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                            <img src={heroSrc(design.slug)} alt="" loading="lazy" className="h-full w-full object-cover" />
                          </span>
                          <span className="mt-2 block font-mono text-[10px] tracking-[0.25em] text-ink-dim">
                            {design.name.toUpperCase()}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Always-available plain links: keyboard, crawlers, and anyone who scrolled past. */}
      <nav aria-label="Collections" className="border-t border-line-soft px-6 py-16 md:px-10">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-12 gap-y-4">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={`/collections/${collection.slug}`}
                className="font-display text-3xl tracking-[0.2em] text-ink-dim transition-colors hover:text-ink"
              >
                <span className="font-mono text-xs tracking-[0.3em] text-ink-faint">{collection.verb}</span>{" "}
                {collection.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
