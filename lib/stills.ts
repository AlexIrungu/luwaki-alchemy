import { existsSync } from "node:fs";
import { join } from "node:path";
import { heroSrc } from "@/lib/hero";

/**
 * Server-only (node:fs): whether a design has a rendered still in public/hero/.
 * Effects only show designs that do — a card with a missing image is worse
 * than no card. Render new ones with `python3 scripts/hero/render.py <slug>`.
 */
export const hasStill = (slug: string) => existsSync(join(process.cwd(), "public", heroSrc(slug)));
