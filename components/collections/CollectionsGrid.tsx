"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { heroSrc } from "@/lib/hero";
import { canMorph } from "@/lib/morph";

/** Live nails for the cards — desktop only, loaded as its own chunk. */
const CollectionNails = dynamic(() => import("@/components/three/CollectionNails"), { ssr: false });

export type GridCollection = {
  slug: string;
  name: string;
  verb: string;
  designs: { slug: string; name: string }[];
};

// Literal class names so Tailwind generates them.
const ROW_TEXT: Record<string, string> = {
  sublime: "text-sublime/20",
  opulence: "text-opulence/20",
  noir: "text-noir/40",
};
const ROW_BRIGHT: Record<string, string> = {
  sublime: "text-sublime/70",
  opulence: "text-opulence/70",
  noir: "text-noir",
};

const TITLE = "COLLECTIONS";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Focus = (collection: string | null, card: HTMLElement | null) => void;

/**
 * The COLLECTIONS page (DESIGN.md §4, after wodniack.dev's WORK section).
 *
 * One pinned stage:
 *   1. the title stands one letter per line inside an arch; as the arch expands
 *      past the viewport, its letters fly out, grow and tilt into the rows —
 *      the intro becomes the grid
 *   2. a plane tilted in perspective carries one row per collection — the name
 *      repeated in huge faint type — sliding in alternating directions, with
 *      that collection's designs riding along as tilted cards. The rows lean
 *      with scroll speed and the cards trail behind them
 *   3. hovering a card lights its collection's row, dims the others, lifts the
 *      card and labels it
 * Clicking a card fades the rest, lifts the card upright to the centre, and
 * then routes to its DESCRIPTION page.
 */
export function CollectionsGrid({ collections }: { collections: GridCollection[] }) {
  const stageRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const focus = useRef<Focus | null>(null);
  const [label, setLabel] = useState<{ name: string; collection: string; count: number } | null>(null);
  const [labelOn, setLabelOn] = useState(false);
  const router = useRouter();

  // Live 3D nails in the cards (desktop, WebGL2, motion allowed). The stills
  // stay underneath and only fade once the nails are drawn; any failure hands
  // the grid straight back to them.
  const hovered = useRef<string | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [live, setLive] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const liveSlugs = useMemo(
    () => collections.flatMap((c) => c.designs.map((d) => d.slug)).filter(canMorph),
    [collections],
  );
  useEffect(() => {
    if (prefersReducedMotion() || liveSlugs.length === 0) return;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const webgl2 = Boolean(document.createElement("canvas").getContext("webgl2"));
    setLive(desktop && webgl2);
  }, [liveSlugs]);
  const onLiveReady = useCallback(() => setLiveReady(true), []);
  const onLiveFail = useCallback(() => {
    setLiveReady(false);
    setLive(false);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const sticky = stickyRef.current;
    const tooltip = tooltipRef.current;
    if (!stage || !sticky || !tooltip || prefersReducedMotion()) return;

    let settle = 0;
    let onPointer: ((event: PointerEvent) => void) | null = null;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage);
      const letters = q("[data-arch-letter]");
      const rows = q("[data-row]");
      const rowTexts = q("[data-row-text]");

      // Hidden starts are set up front, never left to a from() tween — a
      // refresh re-records a from()'s start and can strand things on screen.
      gsap.set(q("[data-plane]"), { opacity: 0 });

      // 1. Where each title letter lands: spread across the width, on the rows
      //    in turn (SUBLIME, OPULENCE, NOIR…). Measured at rest, before it rises.
      const targets = letters.map((letter, i) => {
        const row = rowTexts[i % rowTexts.length].getBoundingClientRect();
        const from = letter.getBoundingClientRect();
        const x = window.innerWidth * (0.1 + 0.8 * ((i * 0.618) % 1));
        const y = row.top + row.height / 2;
        return { x: x - (from.left + from.width / 2), y: y - (from.top + from.height / 2) };
      });
      gsap.set(letters, { yPercent: 100, opacity: 0 });

      // 2. Scroll speed: the rows lean, the cards trail, both settle when you stop.
      const lean = gsap.quickTo(q("[data-velocity]"), "skewX", { duration: 0.5, ease: "power3" });
      const trail = q("[data-lag]").map((card) => gsap.quickTo(card, "x", { duration: 0.6, ease: "power3" }));
      const onScroll = (self: ScrollTrigger) => {
        const velocity = self.getVelocity();
        lean(clamp(velocity / -250, -10, 10));
        trail.forEach((to) => to(clamp(-velocity * 0.02, -60, 60)));
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          lean(0);
          trail.forEach((to) => to(0));
        }, 140);
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: true, onUpdate: onScroll },
      });

      tl.to(letters, { yPercent: 0, opacity: 1, stagger: 0.008, duration: 0.06 }, 0)
        .to(q("[data-arch]"), { scale: 9, duration: 0.2, ease: "power2.in" }, 0.1)
        // The arch is gone while the letters are still in flight, so they cross
        // the rows rather than a grey slab.
        .to(q("[data-arch]"), { opacity: 0, duration: 0.07 }, 0.15)
        .to(
          letters,
          {
            x: (i: number) => targets[i].x,
            y: (i: number) => targets[i].y,
            scale: 5.5,
            rotation: -9,
            duration: 0.14,
            ease: "power2.inOut",
            stagger: 0.004,
          },
          0.1,
        )
        .to(letters, { opacity: 0, duration: 0.05, stagger: 0.004 }, 0.2)
        .to(q("[data-plane]"), { opacity: 1, duration: 0.1 }, 0.17);

      rows.forEach((row, i) => {
        const [from, to] = i % 2 === 0 ? [0, -38] : [-38, 0];
        tl.fromTo(row, { xPercent: from }, { xPercent: to, duration: 0.84 }, 0.16);
      });

      // 3. Hover focus: the card's row lights in its collection colour, the
      //    others dim, the card lifts and squares up.
      const brights = q("[data-row-bright]");
      focus.current = (collection, card) => {
        brights.forEach((el) =>
          gsap.to(el, { opacity: el.dataset.collection === collection ? 1 : 0, duration: 0.4, overwrite: true }),
        );
        rowTexts.forEach((el) =>
          gsap.to(el, {
            opacity: !collection || el.dataset.collection === collection ? 1 : 0.35,
            duration: 0.4,
            overwrite: true,
          }),
        );
        if (card) {
          gsap.to(card, {
            scale: collection ? 1.14 : 1,
            rotation: collection ? 4 : 0,
            duration: 0.45,
            ease: "power3.out",
            overwrite: "auto",
          });
        }
      };

      // The hover label trails the pointer across the pinned stage.
      const toX = gsap.quickTo(tooltip, "x", { duration: 0.3, ease: "power3" });
      const toY = gsap.quickTo(tooltip, "y", { duration: 0.3, ease: "power3" });
      // 4. The whole plane tips a few degrees toward the cursor.
      const tipY = gsap.quickTo(q("[data-tilt]"), "rotationY", { duration: 0.9, ease: "power3" });
      const tipX = gsap.quickTo(q("[data-tilt]"), "rotationX", { duration: 0.9, ease: "power3" });
      onPointer = (event: PointerEvent) => {
        const rect = sticky.getBoundingClientRect();
        toX(event.clientX - rect.left);
        toY(event.clientY - rect.top);
        pointer.current = { x: event.clientX, y: event.clientY };
        tipY(((event.clientX - rect.left) / rect.width - 0.5) * 12);
        tipX(-((event.clientY - rect.top) / rect.height - 0.5) * 8);
      };
      sticky.addEventListener("pointermove", onPointer);
    }, stage);

    return () => {
      window.clearTimeout(settle);
      if (onPointer) sticky.removeEventListener("pointermove", onPointer);
      focus.current = null;
      ctx.revert();
    };
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
      // The still may be faded out under a live nail; the clone must show.
      opacity: "1",
      transition: "none",
    });
    document.body.appendChild(clone);
    card.style.visibility = "hidden";
    setLabelOn(false);

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
        <div
          ref={stickyRef}
          className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto"
        >
          {/* The tilted plane of rows. */}
          <div className="absolute inset-0 flex items-center justify-center motion-reduce:hidden [perspective:1400px]">
            <div data-tilt className="w-full [transform-style:preserve-3d]">
            <div data-plane className="w-full [transform:rotateX(26deg)_rotateZ(-9deg)_scale(1.35)]">
              <div data-velocity className="flex w-full flex-col gap-[6vh]">
                {collections.map((collection) => {
                  const repeated = Array.from({ length: 5 }, () => collection.name).join(" · ");
                  return (
                    <div key={collection.slug} data-row className="relative w-max whitespace-nowrap">
                      <Link
                        href={`/collections/${collection.slug}`}
                        className="relative block font-display text-[15vw] font-light leading-none tracking-[-0.03em]"
                      >
                        <span data-row-text data-collection={collection.slug} className={ROW_TEXT[collection.slug] ?? "text-ink/20"}>
                          {repeated}
                        </span>
                        <span
                          data-row-bright
                          data-collection={collection.slug}
                          aria-hidden="true"
                          className={`absolute inset-0 opacity-0 ${ROW_BRIGHT[collection.slug] ?? "text-ink/60"}`}
                        >
                          {repeated}
                        </span>
                      </Link>

                      {collection.designs.map((design, i) => (
                        <Link
                          key={design.slug}
                          href={`/designs/${design.slug}`}
                          aria-label={`${design.name}, ${collection.name}`}
                          onClick={(event) => open(event, design.slug)}
                          onPointerEnter={(event) => {
                            hovered.current = design.slug;
                            focus.current?.(collection.slug, event.currentTarget.querySelector("[data-lag]"));
                            setLabel({ name: design.name, collection: collection.name, count: collection.designs.length });
                            setLabelOn(true);
                          }}
                          onPointerLeave={(event) => {
                            hovered.current = null;
                            focus.current?.(null, event.currentTarget.querySelector("[data-lag]"));
                            setLabelOn(false);
                          }}
                          style={{ left: `${14 + i * 15}%`, top: i % 2 === 0 ? "-18%" : "22%" }}
                          className="absolute block w-[clamp(7rem,11vw,11rem)] rotate-[-4deg]"
                        >
                          <span data-lag data-live-card data-slug={design.slug} className="block">
                            <span className="block aspect-[3/4] overflow-hidden border border-line bg-panel">
                              {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                              <img
                                src={heroSrc(design.slug)}
                                alt=""
                                loading="lazy"
                                className={`h-full w-full scale-125 object-cover transition-opacity duration-700 ${
                                  liveReady ? "opacity-0" : "opacity-100"
                                }`}
                              />
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </div>

          {live && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
              <CollectionNails
                slugs={liveSlugs}
                root={stickyRef}
                hovered={hovered}
                pointer={pointer}
                onReady={onLiveReady}
                onFail={onLiveFail}
              />
            </div>
          )}

          {/* The arch intro — the arch and its letters are siblings, so the
              letters don't grow with the arch as it expands. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:static motion-reduce:pt-40">
            <div className="relative h-[78vh] w-[min(15rem,40vw)] motion-reduce:h-auto motion-reduce:w-auto">
              <div data-arch className="absolute inset-0 rounded-t-full border border-line bg-panel motion-reduce:hidden" />
              <h1
                id="collections-title"
                aria-label={TITLE}
                className="absolute inset-x-0 top-[16vh] flex flex-col items-center font-display text-3xl leading-[1.05] md:text-4xl motion-reduce:static motion-reduce:flex-row motion-reduce:justify-center motion-reduce:text-5xl motion-reduce:tracking-[0.2em]"
              >
                {TITLE.split("").map((letter, i) => (
                  <span key={i} data-arch-letter aria-hidden="true" className="block">
                    {letter}
                  </span>
                ))}
              </h1>
            </div>
          </div>

          {/* Hover label. */}
          <div
            ref={tooltipRef}
            aria-hidden="true"
            className={`pointer-events-none absolute left-0 top-0 z-40 ml-5 mt-5 transition-opacity duration-300 motion-reduce:hidden ${
              labelOn ? "opacity-100" : "opacity-0"
            }`}
          >
            {label && (
              <>
                <p className="font-display text-2xl font-light">{label.name}</p>
                <p className="mt-1 whitespace-nowrap font-mono text-[10px] tracking-[0.25em] text-ink-dim">
                  {label.collection} · {label.count} {label.count === 1 ? "DESIGN" : "DESIGNS"}
                </p>
              </>
            )}
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
