#!/usr/bin/env node
/**
 * Rhino → web model pipeline (ported from luwaki-demo).
 *
 *   Drop Kent's exports into source/ (gitignored) and run:  npm run models
 *
 * Each export becomes two Draco-compressed GLBs in public/models/:
 *   <slug>-full.glb   every triangle kept, just packed properly
 *   <slug>-web.glb    simplified for phones
 * plus public/models/manifest.json, read straight off the geometry. The
 * catalogue grows by 30 models a month, so nothing here is maintained by hand.
 *
 * The slug is the design's URL slug in `products`, derived from the filename
 * the same way lib/slug.ts derives it from the design name — so a file named
 * "TURTLE_S REEF.gltf" lands on /designs/turtles-reef with no mapping table.
 *
 * Requires the gltf-transform CLI:  npm i -g @gltf-transform/cli
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

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

/**
 * Mirrors slugify() in lib/slug.ts. Rhino writes an apostrophe as "_", so
 * "TURTLE_S REEF" is read as "turtle's reef" first.
 */
const slugFromFile = (file) =>
  basename(file, extname(file))
    .replace(/_(?=s\b)/gi, "'")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

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

if (!existsSync(SOURCE_DIR)) {
  console.error(`No ${SOURCE_DIR}/ directory. Put Kent's exports there and run again.`);
  process.exit(1);
}

const sources = readdirSync(SOURCE_DIR).filter((f) => /\.(gltf|glb)$/i.test(f)).sort();
if (sources.length === 0) {
  console.error(`No .gltf or .glb files in ${SOURCE_DIR}/.`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`${sources.length} source file(s)\n`);

const manifest = [];
let failed = 0;

for (const file of sources) {
  const slug = slugFromFile(file);
  const input = join(SOURCE_DIR, file);
  const full = join(OUT_DIR, `${slug}-full.glb`);
  const web = join(OUT_DIR, `${slug}-web.glb`);

  try {
    run(["optimize", input, full, "--compress", "draco", "--simplify", "false"]);
    run(["optimize", input, web, "--compress", "draco", "--simplify", "true",
      "--simplify-error", String(SIMPLIFY_ERROR)]);
  } catch (error) {
    console.error(`✗ ${file}: ${error.stderr?.toString().trim() || error.message}`);
    failed++;
    continue;
  }

  manifest.push({
    slug,
    sizeKB: { full: kb(full), web: kb(web) },
    vertices: { full: readStats(full).vertices, web: readStats(web).vertices },
    sourceTriangles: readStats(input).triangles,
    sourceMB: +(statSync(input).size / 1024 / 1024).toFixed(1),
  });

  console.log(`${slug.padEnd(18)} ${String(kb(input)).padStart(7)} KB  →  full ${String(kb(full)).padStart(5)} KB   web ${String(kb(web)).padStart(5)} KB`);
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
const total = manifest.reduce((sum, d) => sum + d.sizeKB.full, 0);
console.log(`\n${manifest.length} designs · ${(total / 1024).toFixed(1)} MB at full detail · manifest → ${MANIFEST}`);

if (failed) {
  console.error(`${failed} file(s) failed — see above.`);
  process.exit(1);
}
