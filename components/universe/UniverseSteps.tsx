"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { heroSrc } from "@/lib/hero";
import type { ProgressRef } from "@/components/three/UniverseNail";

const UniverseNail = dynamic(() => import("@/components/three/UniverseNail"), { ssr: false });

export type UniverseDesign = { slug: string; name: string };

/**
 * DRAFT COPY — from confirmed facts (modelled geometry, translucent resin,
 * printed to measurements, monthly releases). Lucy owns the voice.
 */
const STEPS = [
  { mark: "1", word: "DESIGN", body: "Every pattern is modelled as geometry — sculpted into the nail, not printed onto it." },
  { mark: "2", word: "PRINT", body: "Printed layer by layer in translucent resin, to the measurements on your account." },
  { mark: "3", word: "COLOR", body: "Every design, any colour. Move across the designs to try one." },
  { mark: "∞", word: "REPEAT", body: "New designs arrive every month. The universe keeps growing." },
];

const SEG = 1 / STEPS.length;

/**
 * 1 Design · 2 Print · 3 Color · ∞ Repeat (DESIGN.md §6, after duten
 * mue-concept, plus the brief's wireframe printer sketch, rainbow cursor and
 * horizontal scroll). One pinned stage, four equal segments of scroll:
 *
 *   DESIGN / PRINT — the 3D nail as a wireframe, then printed up through it
 *   COLOR — five designs slide sideways; a cursor cycles the spectrum as it
 *           moves and tints whichever design it's over
 *   REPEAT — the designs multiply into a wall
 *
 * Throughout: circled marks roll down the left, and each step's word stands
 * huge and faint behind, scattering into the next.
 */
export function UniverseSteps({ designs, modelSlug }: { designs: UniverseDesign[]; modelSlug: string | null }) {
  const stageRef = useRef<HTMLElement>(null);
  const progress = useRef(0) as ProgressRef;
  const strip = designs.slice(0, 5);
  const wall = designs.length ? Array.from({ length: 20 }, (_, i) => designs[i % designs.length]) : [];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage);
      const scatter = () => ({
        x: () => gsap.utils.random(-420, 420),
        y: () => gsap.utils.random(-300, 300),
        rotation: () => gsap.utils.random(-90, 90),
        opacity: 0,
        duration: 0.08,
        stagger: 0.004,
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            progress.current = self.progress;
          },
        },
      });

      // Circled marks: the column steps up one item per segment.
      const items = q("[data-step-item]");
      gsap.set(items, { scale: 0.45, opacity: 0.25, transformOrigin: "0% 50%" });
      gsap.set(items[0], { scale: 1, opacity: 1 });
      STEPS.forEach((_, i) => {
        if (i === 0) return;
        const at = i * SEG - 0.03;
        tl.to(q("[data-step-col]"), { yPercent: -(100 / STEPS.length) * i, duration: 0.06, ease: "power2.inOut" }, at)
          .to(items[i - 1], { scale: 0.45, opacity: 0.25, duration: 0.06 }, at)
          .to(items[i], { scale: 1, opacity: 1, duration: 0.06 }, at);
      });

      // Faint words scatter out and reassemble; step copy crossfades with them.
      q("[data-word]").forEach((word, i) => {
        const letters = word.querySelectorAll("[data-word-letter]");
        if (i > 0) tl.from(letters, scatter(), i * SEG - 0.02);
        if (i < STEPS.length - 1) tl.to(letters, scatter(), (i + 1) * SEG - 0.1);
      });
      q("[data-step-text]").forEach((text, i) => {
        if (i > 0) tl.from(text, { opacity: 0, y: 30, duration: 0.05 }, i * SEG);
        if (i < STEPS.length - 1) tl.to(text, { opacity: 0, y: -30, duration: 0.05 }, (i + 1) * SEG - 0.06);
      });

      // DESIGN / PRINT → COLOR: the nail gives way to the strip.
      tl.to(q("[data-nail]"), { opacity: 0, scale: 0.85, duration: 0.06 }, 2 * SEG - 0.05);

      const track = q("[data-strip-track]")[0];
      tl.to(q("[data-strip]"), { opacity: 1, duration: 0.04 }, 2 * SEG - 0.04)
        .set(q("[data-strip]"), { pointerEvents: "auto" }, 2 * SEG)
        .fromTo(
          track,
          { x: () => window.innerWidth * 0.6 },
          { x: () => -(track.scrollWidth - window.innerWidth * 0.4), duration: SEG + 0.02 },
          2 * SEG - 0.04,
        )
        .to(q("[data-cursor]"), { opacity: 1, duration: 0.02 }, 2 * SEG)
        .to(q("[data-cursor]"), { opacity: 0, duration: 0.02 }, 3 * SEG - 0.03)
        .set(q("[data-strip]"), { pointerEvents: "none" }, 3 * SEG - 0.02)
        .to(q("[data-strip]"), { opacity: 0, duration: 0.04 }, 3 * SEG - 0.02);

      // REPEAT: the designs multiply into a wall.
      tl.from(q("[data-repeat-card]"), { scale: 0, opacity: 0, duration: 0.08, stagger: { each: 0.004, from: "center" } }, 3 * SEG)
        .from(q("[data-repeat-cta]"), { opacity: 0, y: 20, duration: 0.05 }, 3 * SEG + 0.1)
        .set(q("[data-repeat]"), { pointerEvents: "auto" }, 3 * SEG + 0.1)
        .to({}, { duration: 0.1 }, 0.9);

      // The rainbow cursor: hue advances with distance travelled.
      const cursor = q("[data-cursor]")[0];
      const moveX = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
      const moveY = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
      let hue = 0;
      let lastX = 0;
      let lastY = 0;
      const onMove = (event: PointerEvent) => {
        hue = (hue + Math.hypot(event.clientX - lastX, event.clientY - lastY) * 0.5) % 360;
        lastX = event.clientX;
        lastY = event.clientY;
        stage.style.setProperty("--hue", hue.toFixed(0));
        moveX(event.clientX);
        moveY(event.clientY);
      };
      stage.addEventListener("pointermove", onMove);
      return () => stage.removeEventListener("pointermove", onMove);
    }, stage);

    return () => ctx.revert();
  }, [progress]);

  return (
    <>
      <section
        ref={stageRef}
        aria-label="How LUWAKI is made"
        style={{ ["--hue" as string]: "0" }}
        className="relative h-[640vh] border-t border-line-soft motion-reduce:hidden"
      >
        <div className="sticky top-0 h-svh overflow-hidden">
          {STEPS.map((step) => (
            <p
              key={step.word}
              data-word
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[21vw] font-light leading-none tracking-[-0.03em] text-ink/[0.07]"
            >
              {step.word.split("").map((letter, j) => (
                <span key={j} data-word-letter className="inline-block">
                  {letter}
                </span>
              ))}
            </p>
          ))}

          {modelSlug && (
            <div data-nail className="absolute inset-0">
              <UniverseNail slug={modelSlug} progress={progress} />
            </div>
          )}

          <div data-repeat className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-10 px-6">
            <ul className="grid grid-cols-5 gap-2 md:grid-cols-10">
              {wall.map((design, i) => (
                <li key={i} data-repeat-card className="w-[clamp(2.5rem,7vw,6.5rem)]">
                  <Link
                    href={`/designs/${design.slug}`}
                    aria-label={design.name}
                    className="block aspect-[3/4] overflow-hidden border border-line bg-panel"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                    <img src={heroSrc(design.slug)} alt="" loading="lazy" className="h-full w-full scale-125 object-cover" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              data-repeat-cta
              href="/collections"
              className="font-mono text-[11px] tracking-[0.3em] text-ink-dim transition-colors hover:text-ink"
            >
              EXPLORE THE COLLECTIONS →
            </Link>
          </div>

          <div data-strip className="pointer-events-none absolute inset-0 flex items-center opacity-0">
            <ul data-strip-track className="flex gap-[4vw]">
              {strip.map((design) => (
                <li key={design.slug} className="w-[clamp(12rem,26vw,24rem)] shrink-0">
                  <Link
                    href={`/designs/${design.slug}`}
                    className="group relative block aspect-[3/4] overflow-hidden border border-line bg-panel"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                    <img src={heroSrc(design.slug)} alt="" loading="lazy" className="h-full w-full scale-125 object-cover" />
                    {/* The tint follows the cursor's current hue — dynamic data, not a token. */}
                    <span className="absolute inset-0 bg-[hsl(var(--hue)_85%_60%)] opacity-0 mix-blend-color transition-opacity duration-300 group-hover:opacity-100" />
                  </Link>
                  <p className="mt-3 font-mono text-[10px] tracking-[0.25em] text-ink-dim">{design.name.toUpperCase()}</p>
                </li>
              ))}
            </ul>
          </div>

          <span
            data-cursor
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-50 -ml-3 -mt-3 size-6 rounded-full bg-[hsl(var(--hue)_85%_65%)] opacity-0 shadow-[0_0_40px_12px_hsl(var(--hue)_85%_60%)]"
          />

          <div className="pointer-events-none absolute left-6 top-1/2 -mt-16 md:left-10">
            <ol data-step-col className="flex flex-col">
              {STEPS.map((step) => (
                <li key={step.word} data-step-item className="flex h-32 w-32 items-center">
                  <span className="flex size-28 items-center justify-center rounded-full border border-line font-display text-5xl font-light">
                    {step.mark}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pointer-events-none absolute bottom-10 right-6 h-28 w-[min(22rem,80vw)] md:right-10">
            {STEPS.map((step) => (
              <div key={step.word} data-step-text className="absolute bottom-0 right-0 w-full">
                <p className="font-mono text-[11px] tracking-[0.3em] text-ink-faint">
                  {step.mark} · {step.word}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-dim">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reduced motion: the same four steps, composed and still. */}
      <section aria-label="How LUWAKI is made" className="hidden border-t border-line-soft px-6 py-32 motion-reduce:block">
        <ol className="mx-auto max-w-4xl space-y-16">
          {STEPS.map((step) => (
            <li key={step.word} className="flex gap-8">
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full border border-line font-display text-4xl font-light">
                {step.mark}
              </span>
              <div>
                <h2 className="font-display text-4xl font-light tracking-[0.1em]">{step.word}</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-dim">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <ul className="mx-auto mt-20 grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-5">
          {strip.map((design) => (
            <li key={design.slug}>
              <Link href={`/designs/${design.slug}`} className="block aspect-[3/4] overflow-hidden border border-line bg-panel">
                {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                <img src={heroSrc(design.slug)} alt={design.name} loading="lazy" className="h-full w-full object-cover" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
