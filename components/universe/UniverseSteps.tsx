"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { heroSrc } from "@/lib/hero";
import type { HueRef, ProgressRef } from "@/components/three/UniverseNail";

const UniverseNail = dynamic(() => import("@/components/three/UniverseNail"), { ssr: false });

export type UniverseDesign = { slug: string; name: string };

/**
 * DRAFT COPY — from confirmed facts (modelled geometry, translucent resin,
 * printed to measurements, monthly releases). Lucy owns the voice.
 */
const STEPS = [
  { mark: "1", word: "DESIGN", body: "Every pattern is modelled as geometry — sculpted into the nail, not printed onto it." },
  { mark: "2", word: "PRINT", body: "Printed layer by layer in translucent resin, to the measurements on your account." },
  { mark: "3", word: "COLOR", body: "Every design, any colour. Move across the nail to try one." },
  { mark: "∞", word: "REPEAT", body: "New designs arrive every month. The universe keeps growing." },
];

const SEG = 1 / STEPS.length;

// SVG path builders, so every drawn element is a <path> that can take pathLength.
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;

/** One stroke of a sketch: normalised length, so GSAP draws it by dash offset. */
function Stroke({ d, accent = false }: { d: string; accent?: boolean }) {
  return (
    <path
      data-stroke
      d={d}
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset="1"
      vectorEffect="non-scaling-stroke"
      stroke="currentColor"
      className={accent ? "text-sublime" : undefined}
    />
  );
}

function Label({ x, y, size = 16, children }: { x: number; y: number; size?: number; children: ReactNode }) {
  return (
    <text
      data-label
      x={x}
      y={y}
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      opacity={0}
      className="font-mono"
      style={{ fontSize: size, letterSpacing: "0.2em" }}
    >
      {children}
    </text>
  );
}

/**
 * Line drawings woven around each step's word, in the style of the brief's
 * Pinterest references (a word with monoline illustrations built into it) and
 * the brief's "wireframe printer sketch". Laid out on a 1600 × 600 board
 * centred on the word.
 */
const SKETCHES: ReactNode[] = [
  // DESIGN — pen tool, a Bézier with its handles, a wireframe coffin nail, a cursor, a dimension.
  <>
    <Stroke d="M250 170L290 60L330 170L310 200H270Z" />
    <Stroke d="M290 60V150" />
    <Stroke d={circle(290, 155, 8)} />
    <Stroke d="M170 470C520 330 900 590 1430 420" accent />
    <Stroke d="M520 330L410 270" />
    <Stroke d={circle(410, 270, 9)} />
    <Stroke d="M900 590L1010 560" />
    <Stroke d={circle(1010, 560, 9)} />
    <Stroke d={rect(162, 462, 16, 16)} />
    <Stroke d={rect(1422, 412, 16, 16)} />
    <Stroke d="M1330 50H1400L1420 200Q1365 245 1310 200Z" accent />
    <Stroke d="M1365 50V222M1320 125H1411M1316 170H1415" />
    <Stroke d="M760 80V145L776 131L789 158L799 153L786 127H806Z" />
    <Stroke d="M600 540H1000M600 528V552M1000 528V552" />
    <Label x={800} y={580}>35 MM</Label>
  </>,
  // PRINT — a resin printer, its vat and build plate, the UV beam, layer lines, rising.
  <>
    <Stroke d={rect(140, 70, 180, 250)} />
    <Stroke d={rect(165, 255, 130, 45)} />
    <Stroke d="M185 125H275M230 70V125" />
    <Stroke d="M230 300V380M215 360L230 385L245 360" accent />
    <Stroke d="M480 530H1120M500 530V555M1100 530V555" />
    <Stroke d="M1240 460H1460M1255 482H1445M1270 504H1430M1285 526H1415" accent />
    <Stroke d="M1520 420V250M1500 275L1520 250L1540 275" />
    <Label x={230} y={52}>UV</Label>
    <Label x={800} y={585}>LAYER BY LAYER</Label>
  </>,
  // COLOR — a drop, Wada swatches, a colour wheel, a brush and its stroke.
  <>
    <Stroke d="M260 80C300 140 335 185 335 222A75 75 0 0 1 185 222C185 185 220 140 260 80Z" accent />
    <Stroke d={rect(1140, 60, 60, 60)} />
    <Stroke d={rect(1215, 60, 60, 60)} />
    <Stroke d={rect(1290, 60, 60, 60)} />
    <Stroke d={rect(1365, 60, 60, 60)} />
    <Stroke d={circle(380, 500, 55)} />
    <Stroke d="M380 445V555M325 500H435M341 461L419 539" />
    <Stroke d="M520 505Q700 455 880 505T1240 505" accent />
    <Stroke d="M1290 560L1410 440" />
    <Stroke d="M1410 440L1438 412L1460 434L1432 462Z" />
    <Stroke d="M1449 423Q1500 360 1492 410Q1485 445 1460 434" accent />
    <Label x={1282} y={150}>WADA · 159</Label>
  </>,
  // REPEAT — loop arrows round the word, a monthly calendar, an infinity sign.
  <>
    <Stroke d="M290 300A510 235 0 0 1 1310 300" accent />
    <Stroke d="M1283 268L1310 300L1272 308" accent />
    <Stroke d="M1310 330A510 235 0 0 1 290 330" />
    <Stroke d="M317 362L290 330L328 322" />
    <Stroke d={rect(150, 70, 160, 145)} />
    <Stroke d="M150 110H310M195 55V85M265 55V85" />
    <Label x={230} y={172} size={30}>
      +30
    </Label>
    <Label x={230} y={200} size={11}>
      / MONTH
    </Label>
    <Stroke d="M1390 120C1430 80 1480 80 1480 120C1480 160 1430 160 1390 120C1350 80 1300 80 1300 120C1300 160 1350 160 1390 120Z" />
  </>,
];

/**
 * 1 Design · 2 Print · 3 Color · ∞ Repeat (DESIGN.md §6 — duten mue-concept,
 * the brief's Pinterest word illustrations, "wireframe printer sketch, rainbow
 * cursor"). One pinned stage, four equal segments of scroll. The live nail
 * (components/three/UniverseNail) carries the product through each step while
 * circled marks roll down the left, each step's word stands huge and faint
 * behind with its line drawing sketched in around it, and REPEAT ends on the
 * wall of designs.
 */
export function UniverseSteps({ designs, modelSlugs }: { designs: UniverseDesign[]; modelSlugs: string[] }) {
  const stageRef = useRef<HTMLElement>(null);
  const progress = useRef(0) as ProgressRef;
  const hue = useRef(0) as HueRef;
  const wall = useMemo(
    () => (designs.length ? Array.from({ length: 20 }, (_, i) => designs[i % designs.length]) : []),
    [designs],
  );

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
      // Later words start scattered via gsap.set rather than a from() tween —
      // invalidateOnRefresh re-records a from() start and left all four words
      // stacked on screen at once.
      q("[data-word]").forEach((word, i) => {
        const letters = word.querySelectorAll("[data-word-letter]");
        if (i > 0) {
          gsap.set(letters, {
            x: () => gsap.utils.random(-420, 420),
            y: () => gsap.utils.random(-300, 300),
            rotation: () => gsap.utils.random(-90, 90),
            opacity: 0,
          });
          tl.to(letters, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.08, stagger: 0.004 }, i * SEG - 0.02);
        }
        if (i < STEPS.length - 1) tl.to(letters, scatter(), (i + 1) * SEG - 0.1);
      });
      q("[data-step-text]").forEach((text, i) => {
        if (i > 0) {
          gsap.set(text, { opacity: 0, y: 30 });
          tl.to(text, { opacity: 1, y: 0, duration: 0.05 }, i * SEG);
        }
        if (i < STEPS.length - 1) tl.to(text, { opacity: 0, y: -30, duration: 0.05 }, (i + 1) * SEG - 0.06);
      });

      // Each word's line drawing sketches itself in as its step arrives, and
      // is erased — drawn onward, not rewound — as the step leaves.
      q("[data-sketch]").forEach((sketch, i) => {
        const strokes = sketch.querySelectorAll("[data-stroke]");
        const labels = sketch.querySelectorAll("[data-label]");
        const at = i * SEG + 0.01;
        tl.fromTo(strokes, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.1, stagger: 0.006 }, at).fromTo(
          labels,
          { opacity: 0 },
          { opacity: 1, duration: 0.04 },
          at + 0.08,
        );
        if (i < STEPS.length - 1) {
          tl.to(strokes, { strokeDashoffset: -1, duration: 0.06, stagger: 0.003 }, (i + 1) * SEG - 0.08).to(
            labels,
            { opacity: 0, duration: 0.03 },
            (i + 1) * SEG - 0.08,
          );
        }
      });

      // The wall's hidden start is set outside the timeline: invalidateOnRefresh
      // (needed for the scatter's random values) re-records a from() tween's
      // start, which left the wall showing over the whole section.
      gsap.set(q("[data-repeat-card]"), { scale: 0, opacity: 0 });
      gsap.set(q("[data-repeat-cta]"), { opacity: 0, y: 20 });

      // COLOR: the rainbow cursor shows; REPEAT: the nail gives way to the wall.
      tl.to(q("[data-cursor]"), { opacity: 1, duration: 0.02 }, 2 * SEG)
        .to(q("[data-cursor]"), { opacity: 0, duration: 0.02 }, 3 * SEG - 0.03)
        .to(q("[data-nail]"), { opacity: 0, scale: 0.85, duration: 0.06 }, 3 * SEG - 0.02)
        .to(q("[data-repeat-card]"), { scale: 1, opacity: 1, duration: 0.08, stagger: { each: 0.004, from: "center" } }, 3 * SEG + 0.02)
        .to(q("[data-repeat-cta]"), { opacity: 1, y: 0, duration: 0.05 }, 3 * SEG + 0.12)
        .set(q("[data-repeat]"), { pointerEvents: "auto" }, 3 * SEG + 0.12)
        .to({}, { duration: 0.1 }, 0.9);

      // The rainbow cursor: hue advances with distance travelled, and the live
      // nail reads the same hue.
      const cursor = q("[data-cursor]")[0];
      const moveX = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
      const moveY = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
      let lastX = 0;
      let lastY = 0;
      const onMove = (event: PointerEvent) => {
        hue.current = (hue.current + Math.hypot(event.clientX - lastX, event.clientY - lastY) * 0.5) % 360;
        lastX = event.clientX;
        lastY = event.clientY;
        stage.style.setProperty("--hue", hue.current.toFixed(0));
        moveX(event.clientX);
        moveY(event.clientY);
      };
      stage.addEventListener("pointermove", onMove);
      return () => stage.removeEventListener("pointermove", onMove);
    }, stage);

    return () => ctx.revert();
  }, [progress, hue]);

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

          {STEPS.map((step, i) => (
            <svg
              key={step.word}
              data-sketch
              aria-hidden="true"
              viewBox="0 0 1600 600"
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[min(110vw,1700px)] -translate-x-1/2 -translate-y-1/2 text-ink/40"
            >
              {SKETCHES[i]}
            </svg>
          ))}

          {modelSlugs.length > 0 && (
            <div data-nail className="absolute inset-0">
              <UniverseNail slugs={modelSlugs} progress={progress} hue={hue} />
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
          {designs.slice(0, 5).map((design) => (
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
