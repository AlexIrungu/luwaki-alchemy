# LESSONS.md — luwaki-collective (LUWAKI ALCHEMY)

Gotchas learned building this. Read before touching WebGL effects, GSAP timelines, theming, checkout
money, or the dev tooling. Architecture rules live in CLAUDE.md; this file is what bit us.

## WebGL / 3D
- **The Intel UHD iGPU loses the WebGL context under GLB + `transmission`.** The first hero morph
  (two Draco GLBs with MeshPhysicalMaterial transmission) died with `THREE.WebGLRenderer: Context
  Lost`. Rebuilt as a **map-based surface morph**: designs baked to height + colour PNGs
  (`scripts/morph/bake.py` → `public/morph/`) displacing one grid mesh. Keep hero-scale effects
  map-based. Every canvas listens for `webglcontextlost` and falls back to 2D.
- **Kent lays every design out on one Rhino sheet**, so each export sits at a different world
  position. Centre before comparing or baking — 14 of 15 designs share an identical coffin shell.
- **The patterned top of every export is +Y; a plain `rotation-x: -π/2` shows the underside.** The
  design viewer and the still renderer both did this for weeks: the nail opened back-first, the
  turn-in ended on the underside, and relief designs (Rimuru, Dragon Scale) rendered "flat". Stand a
  nail up with `[-π/2, π, 0, "YXZ"]` (or `+π/2` about X when the tip may point down, as the effects
  do). Check a relief design, not a lattice — lattices look the same from both sides.
- **Exports are not centred — rotate the camera, or `<Center>` the nail before rotating the object.**
  Each model keeps its Rhino-sheet offset (up to 0.8 m). An orbit camera hides this; a turntable that
  rotates the nail group swings it out of frame (blank canvas, `renderer.info.render.calls === 0`).
- **A shape morph needs a signed distance field, not the mask.** Blending the colour-map alpha (or
  per-region staggered progress) frays a moving outline. `loadMaps` derives a signed distance per
  texel (inside +, outside −) into the height texture's A channel; the shader blends A with one
  global eased progress and discards `vSdf < 0`. Shapes line up because every bake anchors the
  cuticle (low Z in all of Kent's exports) — centring would shrink an oval toward the middle.
- **`array.map(fn)` / `.filter(fn)` passes the index as the 2nd argument.** Adding an optional
  `shape` parameter to `loadMaps`/`canMorph` silently turned `slugs.map(loadMaps)` into
  `loadMaps(slug, 0)`. Always wrap: `slugs.map((slug) => loadMaps(slug))`.
- **Bake: never smooth the outline with `binary_opening`** — it notches the rim. Keep only the
  largest connected component (scipy) to drop islands.
- **drei `<Bounds>` fits against world scale.** An entrance that *scales* the nail in makes Bounds
  frame the small version and the nail grows past the margin. Animate rotation only inside Bounds.
- **Shader colours come from CSS tokens, but the resin shell must not.** It read `--color-ink`;
  flipping to a light theme made ink dark and every nail went dark. It now reads `--color-shell`,
  which no theme overrides.
- **Headless captures can use the real GPU**: Chrome with `--ignore-gpu-blocklist --enable-gpu
  --use-angle=gl` reports `ANGLE (Intel, Mesa Intel(R) UHD Graphics…)`. SwiftShader is too slow and
  not representative. The full-quality GLB takes ~10–15s to appear headless — wait before judging a
  "blank" viewer.

## GSAP / scroll
- **`invalidateOnRefresh: true` + `from()` tweens strand elements on screen.** On refresh the
  `from()` re-records its start from the current (already-animated) state. Symptom: the REPEAT wall
  visible early, all four words stacked. Fix: set hidden starts with `gsap.set()` *outside* the
  timeline, then animate with `tl.to()`.
- **Scope `gsap.context()` to the wrapper that contains every target.** Scoped to the `<h1>`, the
  rule beside it threw `GSAP target [data-rule] not found`.
- Lenis is driven from the GSAP ticker (`SmoothScroll`) so ScrollTrigger and smooth scroll agree on
  position. It is not mounted on `/admin` (`StorefrontOnly`).

## Theming (light default + dark)
- **Tokens are overridden, not duplicated as `dark:` variants.** `@theme` holds the light set;
  `:root[data-theme="dark"]` and a `prefers-color-scheme` block override the same variables, so every
  utility follows. A pre-paint script in `app/layout.tsx` applies the stored choice (key
  `luwaki.theme`) — `<html>` needs `suppressHydrationWarning`.
- **Brand colours are the site's, never a design's.** Stills used to be lit by gold + turquoise
  lamps, tinting the nails. Renders are now neutral white light on a **transparent** background, so
  one still works on both themes. The 2D hero shader composites them over `uGround`, which updates
  when the theme changes.
- **`mix-blend-difference` needs white text in both themes** (`text-invert`), not `text-ink` — ink
  flips per theme and the header vanished.
- Turquoise and gold are too light for text on the pale ground: `resin` / `flag` are per-theme
  text-safe versions.

## Money / checkout
- **VAT is exclusive (16%)**: catalogue prices are net. `lib/tax.ts#orderTotals` is the one place an
  order is added up — VAT is rounded **once** on (subtotal + shipping), never per nail. The Paystack
  amount is `total_kes`; the webhook compares against it.
- **An order becomes `shipped` only through `dispatchOrder`** (courier required). `setOrderStatus`
  refuses it, and cancel/refund require a reason — both land in `activity_log`.
- **Log "paid" only when the update actually moved the row** (`.eq("status","pending_payment")
  .select("id")`), or the webhook and the success page each write one.

## Next 16
- `middleware.ts` is deprecated → **`proxy.ts`** exporting `proxy`.
- `next dev` blocks `127.0.0.1` as an origin — captures must hit `http://localhost:3100`, or the page
  never hydrates.
- `searchParams` / `params` are Promises.
- **GitHub Pages cannot host this app**: server actions, the Paystack webhook route, the auth proxy
  and the service-role client all need a server. Deploy target is Vercel.

## Dependencies
- **React is pinned `~19.2.8`**: `@react-three/fiber` 9.7.0 caps its peer at `<19.3`, and npm
  resolved 19.3.0 → `ERESOLVE`. Don't use `--legacy-peer-deps`; pin.

## Tooling
- **`pkill -f <pattern>` from the Bash tool kills its own shell** (exit 144) when the pattern appears
  in the command line itself. Kill by PID (`ss -ltnp` / `ps`) instead.
- `scripts/attach-media.mjs`: Supabase Storage returns an **empty 201 body** — parse JSON only when
  the body is non-empty.
- designlang is bot-walled on rudlundschwarm.at and wodniack.dev ("One moment, please…") — use
  screenshots for those references.
