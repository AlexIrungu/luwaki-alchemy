# LUWAKI ALCHEMY — Design & Motion System

Read with `CLAUDE.md` (engineering rules). This file is the *look and motion* contract: what each
effect is, which reference it comes from, and the rules every effect obeys. References were
studied 2026-09-15 — screenshots at scroll depth, library detection, designlang where it wasn't
bot-walled.

## Tokens

All colour lives in the `@theme` block of `app/globals.css`. Never raw hex in a component.

| Token | Value | Source |
|---|---|---|
| `burgundy` | `#802626` | Sanzo Wada — Pale Burnt Lake |
| `turquoise` | `#62c6bf` | Sanzo Wada — Venice Green (plate 283 with burgundy) |
| `gold` | `#e2b540` | Sanzo Wada — Yellow Ocher (plate 124 with burgundy) |
| `ground` | `#08070a` | Placeholder near-black — the resin reads best on it |

Collection accents: SUBLIME = turquoise · OPULENCE = gold · NOIR = burgundy. Burgundy is too dark
for text on the ground — accents, borders, glows only.

**Type** (fonts are placeholders until Lucy's sheet): display = Cormorant, body = Inter, labels =
JetBrains Mono in wide tracking. The references all set display type **huge and light** —
vanguart's h1 is 144px / weight 300 with tight negative tracking. Effects should follow that:
one enormous word, not several medium ones.

## Motion rules (every effect)

1. **Reduced motion is checked in JS** before any GSAP timeline or Lenis instance starts. The CSS
   block in `globals.css` cannot stop a scroll-pinned animation. Reduced motion gets the final
   composed state, static.
2. **Lenis owns scrolling; GSAP ScrollTrigger reads it.** One Lenis instance, driven from the GSAP
   ticker, so pinned sections and smooth scroll never disagree about position.
3. **Animate only `transform` and `opacity`** (plus WebGL uniforms). No layout properties in a
   scroll-linked tween.
4. **Spectacle on home, UNIVERSE, COLLECTIONS. Restraint on design, cart, account, checkout.**
   Lenis runs site-wide, but effects never touch commerce pages beyond the design-name reveal.
5. **Real product imagery only.** Effects use the hero stills (`public/hero/`) and design renders
   from `product_media` — never stock placeholders.
6. **Every effect degrades to readable static content** without WebGL or JS.

## Effects → references

### 1. Hero morph — `components/home/HeroMorph.tsx` + `components/three/HeroNail3D.tsx` ✅ built
Ref: generousbranding.com/vision — their `marque-au-coeur-1920.mp4` (20.9 s loop, offline 3D render):
one object floating centre-frame over a studio backdrop with a contact shadow; silhouette and
surface change independently, new surfaces *grow out of* / *sink into* the body; seamless loop.

LUWAKI's version is **real-time**, not video. 14 of 15 designs share an identical coffin shell
(Kent laid them out on one Rhino sheet), so one shell stays on screen while the current pattern
sinks 3 mm into the resin and noise-dissolves (turquoise edge) as the next rises out. ~4 s per
design (3 s hold + 1.4 s morph), slow turn + float, dark studio backdrop from tokens.
Fractured Relic is excluded automatically — its cracked pattern is its own shell.
**Phones / no WebGL2 → the 2D image dissolve. Reduced motion → first still, static.**
When the other four shapes arrive, the silhouette can morph too (needs resampling to shared
topology).

### 2. Collection blocks — DREAM → SUBLIME · EMBODY → OPULENCE · CONJURE → NOIR — `components/home/CollectionBlocks.tsx` ✅ built
- **Big numeral, pinned at the edge** — rudlundschwarm.at: a viewport-height numeral (1, 2, 3)
  sits pinned at one edge while its section scrolls, and swaps as the next section arrives. Their
  "2001" is the same numeral as a rolling digit counter.
- **Vertical letter stack** — vanguart.com / wodniack.dev: the word set one letter per line
  ("E N V I S I O N", "W O R K"). The verb (DREAM) stacks vertically and resolves into the
  collection name.
- **Images orbiting the word** — vanguart ENVISION + the brief's Pinterest pins (a word with
  illustrations placed around and inside its letters): the collection name enormous and still,
  its five design renders drifting past at different scroll speeds, some in front of the letters,
  some behind.

### 3. ENVISION — pinned section, then four WORDS / PICTURE rows — `components/home/Envision.tsx` ✅ built (row copy is a draft)
Ref: vanguart.com. The word ENVISION pinned full-width while images cross it at varying parallax
speeds; after the pin, a split word pulls apart (their "NEW ERA"), then four rows alternating
copy and image. **Exclude** vanguart's "EXPLORING THE FUTURE" block (brief).

### 4. COLLECTIONS — angled scroll grid — `components/collections/CollectionsGrid.tsx` ✅ built
Ref: wodniack.dev WORK section. The word first appears stacked vertically inside an arch, then
its letters **multiply into long rows** (WWWW / OOOO / RRRR / KKKK) tilted in perspective, with
project cards floating across the rows at angles. For LUWAKI: rows of the collection name's
letters, design cards crossing them. Clicking a design phases out the rest, rotates it upright,
and routes to its DESCRIPTION page.

### 5. Design name effect — DESCRIPTION page — `components/DesignName.tsx` ✅ built
Brief: the "STRATEGY logo effect" on entry. Keep it to a letter reveal on load — this is a
commerce page (rule 4).

### 6. UNIVERSE — hero + 1 Design · 2 Print · 3 Color · ∞ Repeat — `components/universe/` ✅ built (step copy is a draft)
Ref: duten.com/en/mue-concept. Exactly this pattern: a **numbered stepper in circles**
(1 → 2 → 3 → ∞) rolling down the left while one product stays centred; behind it a **huge faded
word** whose letters scatter apart and reassemble as the product breaks into parts. For LUWAKI:
the nail model through Design (wireframe) → Print (layers) → Color (colourway) → Repeat.
Plus the rainbow cursor across five designs (brief).

### 7. Smooth scroll — Lenis, site-wide — `components/motion/SmoothScroll.tsx` ✅ built
All four studied sites run Lenis or luge (a Lenis-based scroll library): vanguart, duten,
rudlundschwarm, wodniack. It is the baseline feel of the whole reference set.

## What the references are not
- **Not their palettes.** wodniack is red, rudlundschwarm yellow, vanguart and duten white. LUWAKI
  keeps its dark ground and brand colours; only the motion and type scale transfer.
- designlang tokens were usable for vanguart and duten only; rudlundschwarm and wodniack returned
  a bot-check page ("One moment, please…") and were discarded.
