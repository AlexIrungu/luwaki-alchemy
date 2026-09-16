import manifest from "@/public/morph/manifest.json";
import type { Shape } from "@/lib/catalogue";

/**
 * The surface-morph grid, written by `python3 scripts/morph/bake.py`. Every
 * bake is anchored at the cuticle on one shared grid, so any design in any
 * shape lines up texel for texel with every other.
 */
export const MORPH = manifest as {
  cell: number;
  width: number;
  height: number;
  bounds: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number };
  /** Designs with a coffin bake. */
  designs: string[];
  /** Every baked shape per design, in catalogue order. */
  shapes: Record<string, Shape[]>;
};

export const morphShapes = (slug: string): Shape[] => MORPH.shapes[slug] ?? [];

export const canMorph = (slug: string, shape: Shape = "coffin") => morphShapes(slug).includes(shape);

/** One bake: a design in a shape. */
export const morphKey = (slug: string, shape: Shape = "coffin") => `${slug}-${shape}`;

export const morphHeightSrc = (slug: string, shape: Shape = "coffin") => `/morph/${morphKey(slug, shape)}-height.png`;
export const morphColorSrc = (slug: string, shape: Shape = "coffin") => `/morph/${morphKey(slug, shape)}-color.png`;
