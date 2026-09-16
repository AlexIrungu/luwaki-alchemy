"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { FINGERS, HANDS, type Finger, type Hand, type Shape } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";
import type { SlotItem } from "./types";

/**
 * The set, saved to the account so it follows the customer between devices.
 * Only which variant sits on which finger is stored — names and prices are
 * read fresh from the catalogue on the way back, like at checkout.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;
type SlotRef = { hand: Hand; finger: Finger; variantId: string };

type VariantRow = {
  id: string;
  options: { shape?: Shape };
  price_kes: number | null;
  is_published: boolean;
  products: { slug: string; name: string; unit_price_kes: number; is_published: boolean } | null;
};

const slotRefs = z
  .array(z.object({ hand: z.enum(HANDS), finger: z.enum(FINGERS), variantId: z.uuid() }))
  .max(10);

/** Current catalogue details for each slot; slots whose design is no longer on sale come back as skipped. */
async function withCatalogue(supabase: Supabase, refs: (SlotRef & { name?: string })[]) {
  const ids = [...new Set(refs.map((r) => r.variantId))];
  const { data } = ids.length
    ? await supabase
        .from("product_variants")
        .select("id, options, price_kes, is_published, products(slug, name, unit_price_kes, is_published)")
        .in("id", ids)
        .returns<VariantRow[]>()
    : { data: [] as VariantRow[] };
  const byId = new Map((data ?? []).map((v) => [v.id, v]));

  const items: SlotItem[] = [];
  const skipped: string[] = [];
  for (const ref of refs) {
    const variant = byId.get(ref.variantId);
    const product = variant?.products;
    if (!variant || !product || !variant.is_published || !product.is_published || !variant.options.shape) {
      skipped.push(ref.name ?? product?.name ?? "A design");
      continue;
    }
    items.push({
      id: randomUUID(),
      hand: ref.hand,
      finger: ref.finger,
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      shape: variant.options.shape,
      unitPriceKES: variant.price_kes ?? product.unit_price_kes,
    });
  }
  return { items, skipped };
}

/** The account's cart row, created on first save. Oldest wins if a race ever made two. */
async function cartId(supabase: Supabase, profileId: string, create: boolean) {
  const { data } = await supabase
    .from("carts")
    .select("id")
    .eq("profile_id", profileId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (data || !create) return data?.id ?? null;
  const { data: made } = await supabase.from("carts").insert({ profile_id: profileId }).select("id").single();
  return made?.id ?? null;
}

/** The saved set, or null when nobody is signed in. */
export async function loadSavedSet(): Promise<{ items: SlotItem[]; skipped: string[] } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const id = await cartId(supabase, user.id, false);
  if (!id) return { items: [], skipped: [] };
  const { data: rows } = await supabase
    .from("cart_items")
    .select("slot_hand, slot_finger, variant_id")
    .eq("cart_id", id)
    .not("slot_hand", "is", null);

  return withCatalogue(
    supabase,
    (rows ?? []).map((r) => ({ hand: r.slot_hand as Hand, finger: r.slot_finger as Finger, variantId: r.variant_id })),
  );
}

/** Replaces the saved set with these slots. A no-op when nobody is signed in. */
export async function saveSet(input: SlotRef[]): Promise<{ ok: boolean }> {
  const parsed = slotRefs.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const id = await cartId(supabase, user.id, parsed.data.length > 0);
  if (!id) return { ok: parsed.data.length === 0 };

  // Ten rows at most: replacing them outright is simpler than diffing, and the
  // unique (cart, hand, finger) index keeps a finger from ever holding two.
  const { error: cleared } = await supabase.from("cart_items").delete().eq("cart_id", id);
  if (cleared) return { ok: false };
  if (parsed.data.length) {
    const { error } = await supabase.from("cart_items").insert(
      parsed.data.map((s) => ({ cart_id: id, slot_hand: s.hand, slot_finger: s.finger, variant_id: s.variantId })),
    );
    if (error) return { ok: false };
  }
  await supabase.from("carts").update({ updated_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}

/** A past order's ten slots at today's prices; designs no longer sold are named in `skipped`. */
export async function reorderSet(orderId: string): Promise<{ items: SlotItem[]; skipped: string[] } | null> {
  if (!z.uuid().safeParse(orderId).success) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS only returns items of the customer's own orders.
  const { data: rows } = await supabase
    .from("order_items")
    .select("slot_hand, slot_finger, variant_id, product_name")
    .eq("order_id", orderId)
    .not("slot_hand", "is", null);
  if (!rows?.length) return null;

  const withVariant = rows.filter((r) => r.variant_id);
  const { items, skipped } = await withCatalogue(
    supabase,
    withVariant.map((r) => ({
      hand: r.slot_hand as Hand,
      finger: r.slot_finger as Finger,
      variantId: r.variant_id as string,
      name: r.product_name,
    })),
  );
  // A variant deleted outright leaves no id to look up.
  return { items, skipped: [...skipped, ...rows.filter((r) => !r.variant_id).map((r) => r.product_name)] };
}
