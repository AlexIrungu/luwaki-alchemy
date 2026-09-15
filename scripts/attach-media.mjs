#!/usr/bin/env node
/**
 * Bulk version of the admin "upload media" action, for a whole delivery at once.
 *
 *   node --env-file=.env.local scripts/attach-media.mjs <mapping.json>
 *
 * mapping.json:  { "fractured-relic": ["/abs/path/cracked.jpg", ...], ... }
 *
 * Mirrors uploadMedia() in app/admin/actions.ts exactly — same bucket, same
 * `<product id>/<uuid>.<ext>` path, same product_media row — so a design looks
 * identical whether its images came from here or from /admin.
 *
 * Skips any design that already has media, so it is safe to re-run. It never
 * publishes anything: publishing stays a deliberate click in /admin.
 */

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Run with --env-file=.env.local");

const mappingPath = process.argv[2];
if (!mappingPath) throw new Error("Usage: attach-media.mjs <mapping.json>");
const mapping = JSON.parse(readFileSync(mappingPath, "utf8"));

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  // Prefer: return=minimal answers 201 with an empty body — only parse what's there.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

let failed = 0;

for (const [slug, files] of Object.entries(mapping)) {
  const [product] = await rest(`products?slug=eq.${slug}&select=id,product_media(count)`);
  if (!product) {
    console.error(`✗ ${slug}: no such design`);
    failed++;
    continue;
  }
  if (product.product_media[0].count > 0) {
    console.log(`- ${slug}: already has media, skipped`);
    continue;
  }

  for (const [i, file] of files.entries()) {
    const ext = extname(file).toLowerCase();
    const contentType = TYPES[ext];
    if (!contentType) {
      console.error(`✗ ${slug}: ${file} is not an image`);
      failed++;
      continue;
    }

    const path = `${product.id}/${randomUUID()}${ext}`;
    const upload = await fetch(`${url}/storage/v1/object/product-media/${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": contentType },
      body: readFileSync(file),
    });
    if (!upload.ok) {
      console.error(`✗ ${slug}: upload failed — ${upload.status} ${await upload.text()}`);
      failed++;
      continue;
    }

    await rest("product_media", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        product_id: product.id,
        url: `${url}/storage/v1/object/public/product-media/${path}`,
        alt: basename(file, ext),
        sort_order: i,
      }),
    });
    console.log(`✓ ${slug}: ${basename(file)}`);
  }
}

if (failed) {
  console.error(`\n${failed} failure(s) — see above.`);
  process.exit(1);
}
