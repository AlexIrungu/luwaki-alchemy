import manifest from "@/public/morph/manifest.json";

/**
 * The hero surface-morph grid, written by `python3 scripts/morph/bake.py`.
 * Every design listed shares the coffin shell, so its maps line up texel for
 * texel with every other design's.
 */
export const MORPH = manifest as {
  cell: number;
  width: number;
  height: number;
  bounds: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number };
  designs: string[];
};

export const canMorph = (slug: string) => MORPH.designs.includes(slug);

export const morphHeightSrc = (slug: string) => `/morph/${slug}-height.png`;
export const morphColorSrc = (slug: string) => `/morph/${slug}-color.png`;
