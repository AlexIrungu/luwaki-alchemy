import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registered once, here, so every effect shares one ScrollTrigger instance —
// the one SmoothScroll keeps in sync with Lenis.
if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/**
 * Checked in JS before any timeline or Lenis instance starts (DESIGN.md, motion
 * rule 1): the CSS rule in globals.css cannot stop a scroll-linked animation.
 */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
