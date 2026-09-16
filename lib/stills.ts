import { existsSync } from "node:fs";
import { join } from "node:path";
import { heroSrc } from "@/lib/hero";
import type { Shape } from "@/lib/catalogue";

/**
 * Server-only (node:fs): whether a design has a rendered still in public/hero/.
 * Effects only show designs that do — a card with a missing image is worse
 * than no card. Render new ones with `python3 scripts/hero/render.py <slug>`.
 */
export const hasStill = (slug: string) => existsSync(join(process.cwd(), "public", heroSrc(slug)));

export const shapeStillSrc = (slug: string, shape: Shape) => `/shapes/${slug}-${shape}.webp`;

/**
 * Shape-strip tiles rendered so far, by `python3 scripts/hero/render.py --shapes`.
 * Server-only, like hasStill.
 */
export const shapeStills = (slug: string, shapes: Shape[]) =>
  Object.fromEntries(
    shapes
      .filter((shape) => existsSync(join(process.cwd(), "public", shapeStillSrc(slug, shape))))
      .map((shape) => [shape, shapeStillSrc(slug, shape)]),
  ) as Partial<Record<Shape, string>>;
