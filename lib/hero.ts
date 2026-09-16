import type { Shape } from "@/lib/catalogue";

/**
 * Designs that cycle through the home-page hero, in order. Stills are rendered
 * from the 3D models by `python3 scripts/hero/render.py` into public/hero/.
 * Rimuru is left out: its coffin export's colours are so pale the renderer reads
 * the whole design as resin shell. A slug only appears once its design is published.
 */
export const HERO_SLUGS = [
  "fractured-relic",
  "spikey-sapphire",
  "tidal-form",
  "butterfly-cove",
  "turtles-reef",
  "dragon-scale",
  "crypt-crawler",
  "jungle",
  "kaleidoscope",
] as const;

export const heroSrc = (slug: string) => `/hero/${slug}.webp`;

/** Portrait shape-strip tile, `python3 scripts/hero/render.py --shapes`. Also the phone hero's frames. */
export const shapeStillSrc = (slug: string, shape: Shape) => `/shapes/${slug}-${shape}.webp`;

/**
 * The home hero's own order. Designs with several shapes come first and run
 * back to back, so the sequence can alternate a shape change (same design, new
 * shape) with a design change (same shape, new design). The rest follow as
 * design changes on the coffin. Grows as Kent's shape batches land.
 */
export const HERO_MORPH_ORDER = [
  "butterfly-cove",
  "jungle",
  "leopard-rose",
  "rimuru",
  "fractured-relic",
  "spikey-sapphire",
  "tidal-form",
  "turtles-reef",
  "dragon-scale",
  "crypt-crawler",
  "kaleidoscope",
] as const;

/** Shapes kept out of the hero: Rimuru's coffin export reads as bare shell. */
const HERO_SKIP: Record<string, Shape[]> = { rimuru: ["coffin"] };

export type HeroStep = { slug: string; shape: Shape };

const heroShapes = (slug: string, shapesOf: (slug: string) => Shape[]) =>
  shapesOf(slug).filter((s) => !HERO_SKIP[slug]?.includes(s));

/**
 * Turns an order of designs into the hero's steps. A design keeps the shape on
 * screen when it has it (a design change), and a design with more than one
 * shape then shows another (a shape change) — the one shown least so far, so
 * the sequence moves through the shapes instead of bouncing back to coffin.
 */
export function heroSequence(slugs: readonly string[], shapesOf: (slug: string) => Shape[]): HeroStep[] {
  const steps: HeroStep[] = [];
  const shown = new Map<Shape, number>();
  const show = (slug: string, shape: Shape) => {
    steps.push({ slug, shape });
    shown.set(shape, (shown.get(shape) ?? 0) + 1);
  };
  let shape: Shape = "coffin";
  for (const slug of slugs) {
    const shapes = heroShapes(slug, shapesOf);
    if (shapes.length === 0) continue;
    if (!shapes.includes(shape)) shape = shapes.includes("coffin") ? "coffin" : shapes[0];
    show(slug, shape);
    if (shapes.length > 1) {
      // shapesOf lists shapes in catalogue order, and the sort is stable, so ties keep that order.
      shape = shapes.filter((s) => s !== shape).sort((a, b) => (shown.get(a) ?? 0) - (shown.get(b) ?? 0))[0];
      show(slug, shape);
    }
  }
  return steps;
}

/**
 * The fanned set of ten: every finger can take its own shape, so designs with
 * more than coffin show one of their other shapes, rotating square → stiletto →
 * oval across the set. Coffin-only designs stay coffin.
 */
export function setSequence(slugs: readonly string[], shapesOf: (slug: string) => Shape[]): HeroStep[] {
  let turn = 0;
  return slugs.flatMap((slug) => {
    const shapes = heroShapes(slug, shapesOf);
    if (shapes.length === 0) return [];
    const others = shapes.filter((s) => s !== "coffin");
    return [{ slug, shape: others.length ? others[turn++ % others.length] : shapes[0] }];
  });
}

/** A design page link that opens on a given shape. */
export const designHref = (slug: string, shape?: Shape) => `/designs/${slug}${shape ? `?shape=${shape}` : ""}`;
