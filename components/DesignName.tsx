"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

// Literal class names so Tailwind generates them.
const ACCENT: Record<string, string> = {
  sublime: "bg-sublime",
  opulence: "bg-opulence",
  noir: "bg-noir",
};

/**
 * The design name's entrance on the DESCRIPTION page (DESIGN.md §5). This is a
 * commerce page, so it plays once on load and never ties itself to scroll:
 * letters rise into place with a slight tilt, then a hairline in the
 * collection's colour draws in underneath.
 */
export function DesignName({ name, collection }: { name: string; collection: string | null }) {
  // Scoped to the wrapper: the rule sits beside the heading, not inside it.
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.15 })
        .from("[data-letter]", {
          yPercent: 115,
          rotationX: -70,
          opacity: 0,
          transformOrigin: "50% 100%",
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.035,
        })
        .from("[data-rule]", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.8, ease: "power3.inOut" }, 0.35);
    }, wrapper);

    return () => ctx.revert();
  }, [name]);

  return (
    <div ref={ref}>
      <h1 aria-label={name} className="mt-3 font-display text-5xl [perspective:600px]">
        {name.split(" ").map((word, w) => (
          // Words stay whole so a long name wraps between words, never mid-word.
          <span key={w} aria-hidden="true" className="inline-block whitespace-nowrap">
            {word.split("").map((letter, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <span data-letter className="inline-block">
                  {letter}
                </span>
              </span>
            ))}
            {w < name.split(" ").length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </h1>
      <span
        data-rule
        aria-hidden="true"
        className={`mt-4 block h-px w-24 ${collection ? (ACCENT[collection] ?? "bg-line") : "bg-line"}`}
      />
    </div>
  );
}
