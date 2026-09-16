#!/usr/bin/env node
/**
 * The monthly drop: one command from Kent's delivery folder to a catalogue ready
 * for /admin.
 *
 *   npm run drop -- <folder>             do it
 *   npm run drop -- <folder> --dry-run   say what would happen, change nothing
 *
 * 1. Checks every file is named "<DESIGN> <SHAPE>.gltf" — refuses the whole drop otherwise.
 * 2. Copies the files into source/ (a re-export replaces the old file).
 * 3. Creates each design that isn't in the catalogue yet: UNPUBLISHED, the
 *    placeholder price, no collection, all five shape variants. Publishing stays
 *    a deliberate click in /admin once it has a collection, price and copy.
 * 4. Packs the new models (npm run models — unchanged exports are skipped).
 * 5. Bakes the morph maps and renders the shape tiles (+ coffin still) for the
 *    designs in this drop only.
 *
 * Needs .env.local (service-role key), gltf-transform, and Python with the
 * morph/render dependencies — the same as running those steps by hand.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SHAPES, displayName, parseFile } from "./lib/names.mjs";

/** Mirrors PLACEHOLDER_PRICE_KES in app/admin/products/page.tsx — /admin flags a design still on it. */
const PLACEHOLDER_PRICE_KES = 100;
const SOURCE_DIR = "source";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const folder = args.find((a) => !a.startsWith("--"));

const fail = (message) => {
  console.error(`\n✗ ${message}`);
  process.exit(1);
};
const step = (title) => console.log(`\n── ${title}`);
const run = (command, commandArgs) => execFileSync(command, commandArgs, { stdio: "inherit" });

if (!folder) fail("Usage: npm run drop -- <folder with Kent's exports> [--dry-run]");
if (!existsSync(folder) || !statSync(folder).isDirectory()) fail(`Not a folder: ${folder}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail("No Supabase credentials — run through npm (it loads .env.local).");
const supabase = createClient(url, key, { auth: { persistSession: false } });

// ── 1. Names
const files = readdirSync(folder).filter((f) => /\.(gltf|glb)$/i.test(f)).sort();
if (files.length === 0) fail(`No .gltf or .glb files in ${folder}`);

const parsed = files.map((file) => ({ file, ...parseFile(file) }));
const unnamed = parsed.filter((p) => !p.shape);
if (unnamed.length) {
  fail(
    `Nothing done. Rename these "<DESIGN> <SHAPE>.gltf" (${SHAPES.join(" · ")}):\n` +
      unnamed.map((p) => `    ${p.file}`).join("\n"),
  );
}
const external = parsed.filter((p) => p.file.toLowerCase().endsWith(".gltf"));
for (const p of external) {
  // A .gltf can point at separate .bin/texture files; the pipeline expects them embedded.
  let gltf;
  try {
    gltf = JSON.parse(readFileSync(join(folder, p.file), "utf8"));
  } catch {
    fail(`${p.file} isn't readable glTF JSON.`);
  }
  const uris = gltf.buffers?.filter((b) => b.uri && !b.uri.startsWith("data:"));
  if (uris?.length) fail(`${p.file} references external files (${uris.map((b) => b.uri).join(", ")}). Ask Kent for embedded .gltf or .glb.`);
}

// ── 2. What's new
const { data: products, error } = await supabase.from("products").select("slug, name, is_published");
if (error) fail(`Catalogue read failed: ${error.message}`);
const existing = new Map(products.map((p) => [p.slug, p]));

const bySlug = new Map();
for (const p of parsed) {
  if (!bySlug.has(p.slug)) bySlug.set(p.slug, { slug: p.slug, name: displayName(p.design), shapes: [], files: [] });
  bySlug.get(p.slug).shapes.push(p.shape);
  bySlug.get(p.slug).files.push(p.file);
}
const designs = [...bySlug.values()];
const created = designs.filter((d) => !existing.has(d.slug));
const replaced = parsed.filter((p) => existsSync(join(SOURCE_DIR, p.file)));

step(`DROP ${resolve(folder)}${dryRun ? "  (dry run — nothing will change)" : ""}`);
console.log(`${files.length} file(s) · ${designs.length} design(s)`);
for (const d of designs) {
  const status = existing.has(d.slug) ? `existing${existing.get(d.slug).is_published ? ", live" : ""}` : "NEW";
  const order = SHAPES.filter((s) => d.shapes.includes(s));
  console.log(`  ${d.name.padEnd(22)} ${status.padEnd(15)} ${order.join(" · ")}`);
}
if (replaced.length) console.log(`\n${replaced.length} file(s) replace an earlier export: ${replaced.map((p) => p.file).join(", ")}`);
if (created.length) {
  console.log(`\nWill create ${created.length} unpublished design(s) at KES ${PLACEHOLDER_PRICE_KES}/nail, no collection:`);
  for (const d of created) console.log(`  ${d.name}  →  /designs/${d.slug}`);
}

if (dryRun) {
  console.log("\nDry run: stopping here.");
  process.exit(0);
}

// ── 3. Copy
step("Copying into source/");
for (const { file } of parsed) copyFileSync(join(folder, file), join(SOURCE_DIR, basename(file)));
console.log(`${parsed.length} file(s) copied`);

// ── 4. New designs
if (created.length) {
  step("Creating designs");
  for (const d of created) {
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({ slug: d.slug, name: d.name, unit_price_kes: PLACEHOLDER_PRICE_KES, is_published: false })
      .select("id")
      .single();
    if (insertError) fail(`Creating ${d.name}: ${insertError.message}`);
    // Same as generateVariants() in app/admin/actions.ts: a design without variants can't be bought.
    const { error: variantError } = await supabase
      .from("product_variants")
      .upsert(SHAPES.map((shape) => ({ product_id: product.id, options: { shape }, is_published: true })), {
        onConflict: "product_id,options",
        ignoreDuplicates: true,
      });
    if (variantError) fail(`Variants for ${d.name}: ${variantError.message}`);
    console.log(`✓ ${d.name}`);
  }
}

// ── 5. Pipeline, for this drop's designs
const slugs = designs.map((d) => d.slug);
const withCoffin = designs.filter((d) => d.shapes.includes("coffin")).map((d) => d.slug);

step("Models (npm run models)");
run("node", ["--env-file-if-exists=.env.local", "scripts/optimize-models.mjs"]);

step("Morph maps");
run("python3", ["scripts/morph/bake.py", ...slugs]);

step("Shape tiles");
run("python3", ["scripts/hero/render.py", "--shapes", ...slugs]);

if (withCoffin.length) {
  step("Coffin stills");
  run("python3", ["scripts/hero/render.py", ...withCoffin]);
}

// ── 6. What's left
step("DONE — left for you");
if (created.length) {
  console.log("In /admin/products, for each new design: collection · price · description · publish.");
  for (const d of created) console.log(`  ${d.name}`);
}
console.log("Then commit and push the new public/ files:");
console.log(`  git add public/models public/morph public/shapes public/hero && git commit -m "Drop: ${designs.map((d) => d.name).join(", ")}" && git push`);
