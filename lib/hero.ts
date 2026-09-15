/**
 * Designs that cycle through the home-page hero, in order. Stills are rendered
 * from the 3D models by `python3 scripts/hero/render.py` into public/hero/.
 * Dragon Scale and Rimuru are left out: their patterns sit under the shell and
 * go flat in a software render. A slug only appears once its design is published.
 */
export const HERO_SLUGS = [
  "fractured-relic",
  "spikey-sapphire",
  "tidal-form",
  "butterfly-cove",
  "turtles-reef",
  "crypt-crawler",
  "jungle",
  "kaleidoscope",
] as const;

export const heroSrc = (slug: string) => `/hero/${slug}.webp`;

/** Pixel size the stills are rendered at — the shader needs the aspect ratio. */
export const HERO_SIZE = { width: 1920, height: 1080 };
