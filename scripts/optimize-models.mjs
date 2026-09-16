#!/usr/bin/env node
/**
 * Rhino → web model pipeline (ported from luwaki-demo).
 *
 *   Drop Kent's exports into source/ (gitignored) and run:  npm run models
 *
 * Every export is named "<DESIGN> <SHAPE>.gltf" — "JUNGLE OVAL.gltf" — and
 * becomes two Draco-compressed GLBs in public/models/:
 *   <slug>-<shape>-full.glb   every triangle kept, just packed properly
 *   <slug>-<shape>-web.glb    simplified for phones
 * plus public/models/manifest.json, grouped by design, read straight off the
 * geometry. The catalogue grows by 30 models a month, so nothing here is
 * maintained by hand.
 *
 * A file whose name doesn't end in a known shape is rejected, never guessed:
 * a guessed shape would process cleanly and then never appear on the site.
 *
 * The slug is the design's URL slug in `products`, derived from the design
 * part of the filename the same way lib/slug.ts derives it from the design
 * name — so "TURTLE_S REEF COFFIN.gltf" lands on /designs/turtles-reef with no
 * mapping table. With .env.local present, every slug is checked against the
 * catalogue.
 *
 * Requires the gltf-transform CLI:  npm i -g @gltf-transform/cli
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SHAPES, parseFile } from "./lib/names.mjs";

const SOURCE_DIR = "source";
const OUT_DIR = join("public", "models");
const MANIFEST = join(OUT_DIR, "manifest.json");

/**
 * Fraction of the bounding-box diagonal a simplified vertex may move. Nails
 * are ~35 mm long, so 0.00005 is under 2 µm — invisible, but the lattice
 * patterns soften past ~0.0001. Change it deliberately.
 */
const SIMPLIFY_ERROR = 0.00005;

const run = (args) => execFileSync("gltf-transform", args, { stdio: ["ignore", "pipe", "pipe"] });
const kb = (path) => Math.round(statSync(path).size / 1024);

function readStats(path) {
  const buffer = readFileSync(path);
  const json = buffer.readUInt32LE(0) === 0x46546c67
    ? JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString("utf8"))
    : JSON.parse(buffer.toString("utf8"));

  const accessors = json.accessors ?? [];
  let triangles = 0;
  let vertices = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const position = accessors[primitive.attributes?.POSITION];
      if (position) vertices += position.count;
      const indices = accessors[primitive.indices];
      if (indices) triangles += Math.floor(indices.count / 3);
    }
  }
  return { triangles, vertices };
}

/** Slugs in `products`, or null when there are no credentials to ask with. */
async function catalogueSlugs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/products?select=slug`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`catalogue check: ${res.status} ${await res.text()}`);
  return new Set((await res.json()).map((p) => p.slug));
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`No ${SOURCE_DIR}/ directory. Put Kent's exports there and run again.`);
  process.exit(1);
}

const sources = readdirSync(SOURCE_DIR).filter((f) => /\.(gltf|glb)$/i.test(f)).sort();
if (sources.length === 0) {
  console.error(`No .gltf or .glb files in ${SOURCE_DIR}/.`);
  process.exit(1);
}

const parsed = sources.map((file) => ({ file, ...parseFile(file) }));
const unnamed = parsed.filter((p) => !p.shape);
if (unnamed.length) {
  console.error(`These don't end in a shape (${SHAPES.join(" · ")}) — rename them "<DESIGN> <SHAPE>.gltf":`);
  for (const { file } of unnamed) console.error(`  ✗ ${file}`);
  process.exit(1);
}

const known = await catalogueSlugs();
if (known) {
  const strangers = [...new Set(parsed.map((p) => p.slug))].filter((slug) => !known.has(slug));
  if (strangers.length) {
    console.error(`No design in the catalogue for: ${strangers.join(", ")}. Fix the filename or create the design first.`);
    process.exit(1);
  }
} else {
  console.warn("! No Supabase credentials — slugs not checked against the catalogue.\n");
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`${sources.length} source file(s)\n`);

const designs = new Map();
let failed = 0;

for (const { file, slug, shape } of parsed) {
  const input = join(SOURCE_DIR, file);
  const full = join(OUT_DIR, `${slug}-${shape}-full.glb`);
  const web = join(OUT_DIR, `${slug}-${shape}-web.glb`);

  // Only exports newer than their GLBs are re-packed, so a monthly drop doesn't
  // redo the whole catalogue. A copied-in file is always newer.
  const fresh = [full, web].every((out) => existsSync(out) && statSync(out).mtimeMs >= statSync(input).mtimeMs);
  try {
    if (!fresh) {
      run(["optimize", input, full, "--compress", "draco", "--simplify", "false"]);
      run(["optimize", input, web, "--compress", "draco", "--simplify", "true",
        "--simplify-error", String(SIMPLIFY_ERROR)]);
    }
  } catch (error) {
    console.error(`✗ ${file}: ${error.stderr?.toString().trim() || error.message}`);
    failed++;
    continue;
  }

  if (!designs.has(slug)) designs.set(slug, {});
  designs.get(slug)[shape] = {
    sizeKB: { full: kb(full), web: kb(web) },
    vertices: { full: readStats(full).vertices, web: readStats(web).vertices },
    sourceTriangles: readStats(input).triangles,
    sourceMB: +(statSync(input).size / 1024 / 1024).toFixed(1),
  };

  console.log(`${`${slug} ${shape}`.padEnd(26)} ${String(kb(input)).padStart(7)} KB  →  full ${String(kb(full)).padStart(5)} KB   web ${String(kb(web)).padStart(5)} KB${fresh ? "   (unchanged)" : ""}`);
}

const manifest = [...designs]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([slug, byShape]) => ({
    slug,
    shapes: Object.fromEntries(SHAPES.filter((s) => byShape[s]).map((s) => [s, byShape[s]])),
  }));
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

// GLBs no source file produces any more (renamed or retired exports).
const expected = new Set(manifest.flatMap(({ slug, shapes }) =>
  Object.keys(shapes).flatMap((s) => [`${slug}-${s}-full.glb`, `${slug}-${s}-web.glb`])));
const stale = failed ? [] : readdirSync(OUT_DIR).filter((f) => f.endsWith(".glb") && !expected.has(f));
for (const f of stale) rmSync(join(OUT_DIR, f));

const models = manifest.reduce((n, d) => n + Object.keys(d.shapes).length, 0);
const total = manifest.reduce((sum, d) => sum + Object.values(d.shapes).reduce((s, m) => s + m.sizeKB.full, 0), 0);
console.log(`\n${manifest.length} designs · ${models} models · ${(total / 1024).toFixed(1)} MB at full detail · manifest → ${MANIFEST}`);
if (stale.length) console.log(`Removed ${stale.length} stale GLB(s): ${stale.join(", ")}`);

console.log("\nShapes still arriving:");
for (const { slug, shapes } of manifest) {
  const missing = SHAPES.filter((s) => !shapes[s]);
  if (missing.length) console.log(`  ${slug.padEnd(18)} ${missing.join(" · ")}`);
}

if (failed) {
  console.error(`${failed} file(s) failed — see above. Stale GLBs left in place.`);
  process.exit(1);
}
