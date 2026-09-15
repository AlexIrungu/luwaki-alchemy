import manifest from "@/public/models/manifest.json";

export type Quality = "full" | "web";

export type ModelEntry = {
  /** Matches `products.slug`. */
  slug: string;
  sizeKB: Record<Quality, number>;
  vertices: Record<Quality, number>;
  sourceTriangles: number;
  sourceMB: number;
};

/** Written by `npm run models` — never edited by hand. */
const MODELS = manifest as ModelEntry[];

export const modelFor = (slug: string) => MODELS.find((m) => m.slug === slug) ?? null;

export const modelUrl = (slug: string, quality: Quality) => `/models/${slug}-${quality}.glb`;
