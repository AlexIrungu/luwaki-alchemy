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
 * The design name on the DESCRIPTION page — rudlundschwarm's "Strategie" title
 * (brief: "the STRATEGY logo effect"). A thick marker bar in the collection's
 * colour swipes in under the lower third of the letters, then the name is
 * uncovered left to right over it. The reveal is two opposing translates
 * (mask out, text back), so it stays on transforms. Plays once on load:
 * this is a commerce page.
 */
export function DesignName({ name, collection }: { name: string; collection: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.set("[data-bar]", { scaleX: 0 });
      gsap.set("[data-mask]", { xPercent: -101 });
      gsap.set("[data-text]", { xPercent: 101 });
      gsap
        .timeline({ delay: 0.2 })
        .to("[data-bar]", { scaleX: 1, duration: 0.7, ease: "power3.inOut" })
        .to(["[data-mask]", "[data-text]"], { xPercent: 0, duration: 1.1, ease: "expo.out" }, 0.35);
    }, wrapper);

    return () => ctx.revert();
  }, [name]);

  return (
    <div ref={ref}>
      <h1 className="relative mt-4 inline-block font-display text-6xl leading-[1.05] sm:text-7xl lg:text-8xl">
        <span
          data-bar
          aria-hidden="true"
          className={`absolute inset-x-[-0.12em] bottom-[0.08em] h-[0.38em] origin-left ${
            collection ? (ACCENT[collection] ?? "bg-line") : "bg-line"
          }`}
        />
        <span data-mask className="relative block overflow-hidden pb-[0.06em]">
          <span data-text className="block">
            {name}
          </span>
        </span>
      </h1>
    </div>
  );
}
