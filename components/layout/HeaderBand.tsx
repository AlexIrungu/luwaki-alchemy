"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Spectacle routes keep the header floating free over the page. */
const TRANSPARENT = ["/", "/universe", "/collections"];

/**
 * A solid band behind the header once a store page scrolls, so content no
 * longer shows through the nav. It sits under the header's
 * mix-blend-difference, so the nav text still inverts against it in both themes.
 */
export function HeaderBand() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const transparent = TRANSPARENT.some((route) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  if (transparent) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 h-16 border-b border-line-soft bg-ground transition-opacity duration-300 ${
        scrolled ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
