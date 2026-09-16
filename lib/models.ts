import manifest from "@/public/models/manifest.json";
import type { Shape } from "@/lib/catalogue";

export type Quality = "full" | "web";

export type ShapeModel = {
  sizeKB: Record<Quality, number>;
  vertices: Record<Quality, number>;
  sourceTriangles: number;
  sourceMB: number;
};

export type ModelEntry = {
  /** Matches `products.slug`. */
  slug: string;
  /** Only the shapes Kent has delivered so far. */
  shapes: Partial<Record<Shape, ShapeModel>>;
};

/** Written by `npm run models` — never edited by hand. */
const MODELS = manifest as ModelEntry[];

export const modelFor = (slug: string) => MODELS.find((m) => m.slug === slug) ?? null;

export const modelUrl = (slug: string, shape: Shape, quality: Quality) => `/models/${slug}-${shape}-${quality}.glb`;
