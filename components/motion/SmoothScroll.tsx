"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * One Lenis instance for the whole site, driven from the GSAP ticker rather
 * than its own rAF loop, so ScrollTrigger and smooth scroll never disagree
 * about where the page is — pinned sections depend on that.
 */
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const instance = new Lenis({ lerp: 0.1 });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.current = instance;

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  // A route change must land at the top immediately — an eased scroll from
  // the previous page's position would drag every trigger on the new page.
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
  }, [pathname]);

  return null;
}
