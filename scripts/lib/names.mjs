import { basename, extname } from "node:path";

/** Mirrors SHAPES in lib/catalogue.ts — same names, same order. */
export const SHAPES = ["cubic", "square", "stiletto", "coffin", "oval"];

/**
 * Mirrors slugify() in lib/slug.ts. Rhino writes an apostrophe as "_", so
 * "TURTLE_S REEF" is read as "turtle's reef" first.
 */
export const slugify = (name) =>
  name
    .replace(/_(?=s\b)/gi, "'")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** "TURTLE_S REEF" → "Turtle's Reef" — the display name a new design is created with. */
export const displayName = (name) =>
  name
    .replace(/_(?=s\b)/gi, "'")
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase())
    .trim();

/** "JUNGLE OVAL.gltf" → { design: "JUNGLE", slug: "jungle", shape: "oval" }, or null. */
export function parseFile(file) {
  const match = basename(file, extname(file)).trim().match(/^(.+?)[\s_-]+(\S+)$/);
  if (!match) return null;
  const shape = match[2].toLowerCase();
  if (!SHAPES.includes(shape)) return null;
  return { design: match[1], slug: slugify(match[1]), shape };
}
