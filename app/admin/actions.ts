"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SHAPES } from "@/lib/catalogue";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity";

export type AdminState = { error?: string; ok?: boolean };


const productFields = z.object({
  name: z.string().min(2, "A design needs a name."),
  collection_id: z.uuid("Choose a collection."),
  description: z.string().max(2000).optional().nullable(),
  // Per-NAIL price in whole KES. Integer — money is never a float here.
  unit_price_kes: z.coerce.number().int("Whole shillings only.").min(0),
});

export async function createProduct(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const parsed = productFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const slug = slugify(parsed.data.name);
  if (!slug) return { error: "That name produces an empty URL slug." };

  const { data, error } = await supabase
    .from("products")
    .insert({ ...parsed.data, slug })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.code === "23505"
        ? `A design already uses the URL "${slug}".`
        : error.message,
    };
  }

  // A design with no variants cannot be added to a cart, so the five shapes
  // are created up front rather than left as a step to forget.
  await generateVariants(data.id);

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}`);
}

export async function updateProduct(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase, userId, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Unknown design." };

  const parsed = productFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: before } = await supabase.from("products").select("unit_price_kes").eq("id", id.data).single();

  const { error } = await supabase
    .from("products")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id.data);
  if (error) return { error: error.message };

  if (before && before.unit_price_kes !== parsed.data.unit_price_kes) {
    await logActivity(supabase, {
      actor_id: userId,
      entity_type: "product",
      entity_id: id.data,
      action: "price_changed",
      detail: { from_kes: before.unit_price_kes, to_kes: parsed.data.unit_price_kes },
    });
  }

  revalidatePath(`/admin/products/${id.data}`);
  return { ok: true };
}

/** Creates the five shape variants. Safe to re-run — existing ones are kept. */
export async function generateVariants(productId: string) {
  const { supabase, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const rows = SHAPES.map((shape) => ({
    product_id: productId,
    options: { shape },
    is_published: true,
  }));

  const { error } = await supabase
    .from("product_variants")
    .upsert(rows, { onConflict: "product_id,options", ignoreDuplicates: true });
  if (error) return { error: error.message };

  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

/** Per-shape price override. Blank clears it, so the variant inherits again. */
export async function setVariantPrice(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { supabase, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const id = z.uuid().safeParse(formData.get("variant_id"));
  if (!id.success) return { error: "Unknown variant." };

  const raw = formData.get("price_kes");
  const price_kes =
    raw === null || raw === "" ? null : z.coerce.number().int().min(0).safeParse(raw);

  if (price_kes !== null && !price_kes.success) return { error: "Whole shillings only." };

  const { error } = await supabase
    .from("product_variants")
    .update({ price_kes: price_kes === null ? null : price_kes.data })
    .eq("id", id.data);
  if (error) return { error: error.message };

  revalidatePath("/admin/products", "layout");
  return { ok: true };
}

export async function setVariantPublished(variantId: string, isPublished: boolean) {
  const { supabase, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  await supabase
    .from("product_variants")
    .update({ is_published: isPublished })
    .eq("id", variantId);

  revalidatePath("/admin/products", "layout");
  return { ok: true };
}

/**
 * Publishing is what makes a design visible to the public (RLS reads
 * `is_published`), so it refuses to publish something that cannot be bought
 * or has nothing to show.
 */
export async function setPublished(productId: string, publish: boolean): Promise<AdminState> {
  const { supabase, userId, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  if (publish) {
    const [{ count: variants }, { count: media }] = await Promise.all([
      supabase.from("product_variants").select("*", { count: "exact", head: true })
        .eq("product_id", productId).eq("is_published", true),
      supabase.from("product_media").select("*", { count: "exact", head: true })
        .eq("product_id", productId),
    ]);

    if (!variants) return { error: "Publish at least one shape first." };
    if (!media) return { error: "Add at least one image first." };
  }

  const { error } = await supabase
    .from("products")
    .update({ is_published: publish, published_at: publish ? new Date().toISOString() : null })
    .eq("id", productId);
  if (error) return { error: error.message };

  await logActivity(supabase, {
    actor_id: userId,
    entity_type: "product",
    entity_id: productId,
    action: publish ? "published" : "unpublished",
  });

  revalidatePath("/admin/products", "layout");
  revalidatePath("/collections", "layout");
  return { ok: true };
}

export async function uploadMedia(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const productId = z.uuid().safeParse(formData.get("product_id"));
  if (!productId.success) return { error: "Unknown design." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one image." };

  for (const file of files) {
    if (!file.type.startsWith("image/")) return { error: `${file.name} is not an image.` };
    if (file.size > 8_000_000) return { error: `${file.name} is over 8 MB.` };

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${productId.data}/${crypto.randomUUID()}.${ext}`;

    const { error: upload } = await supabase.storage
      .from("product-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upload) return { error: upload.message };

    const { data: { publicUrl } } = supabase.storage.from("product-media").getPublicUrl(path);

    const { error: insert } = await supabase.from("product_media").insert({
      product_id: productId.data,
      url: publicUrl,
      alt: file.name.replace(/\.[^.]+$/, ""),
    });
    if (insert) return { error: insert.message };
  }

  revalidatePath(`/admin/products/${productId.data}`);
  return { ok: true };
}

export async function deleteMedia(mediaId: string) {
  const { supabase, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const { data: row } = await supabase
    .from("product_media").select("url, product_id").eq("id", mediaId).single();

  await supabase.from("product_media").delete().eq("id", mediaId);

  // Remove the object too, or the bucket accumulates orphans nobody can see.
  if (row?.url) {
    const path = row.url.split("/product-media/")[1];
    if (path) await supabase.storage.from("product-media").remove([path]);
  }

  revalidatePath(`/admin/products/${row?.product_id}`);
  return { ok: true };
}

const ORDER_STATUSES = [
  "pending_payment", "paid", "in_production", "shipped", "delivered", "cancelled", "refunded",
] as const;

/** Statuses that take money or work back — they need a reason on record. */
const NEEDS_REASON = ["cancelled", "refunded"];

export async function setOrderStatus(orderId: string, status: string, reason?: string): Promise<AdminState> {
  const { supabase, userId, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const parsed = z.enum(ORDER_STATUSES).safeParse(status);
  if (!parsed.success) return { error: "Unknown status." };
  // Shipping needs a courier on record — that goes through dispatchOrder.
  if (parsed.data === "shipped") return { error: "Use the dispatch form to mark an order shipped." };

  const note = reason?.trim() ?? "";
  if (NEEDS_REASON.includes(parsed.data) && note.length < 3) {
    return { error: "Give a reason — it is kept on the order's timeline." };
  }

  const { data: before } = await supabase.from("orders").select("status").eq("id", orderId).single();
  if (!before) return { error: "Unknown order." };
  if (before.status === parsed.data) return { ok: true };

  const { error } = await supabase
    .from("orders").update({ status: parsed.data }).eq("id", orderId);
  if (error) return { error: error.message };

  await logActivity(supabase, {
    actor_id: userId,
    entity_type: "order",
    entity_id: orderId,
    action: "status_changed",
    from_status: before.status,
    to_status: parsed.data,
    note: note || null,
  });

  revalidatePath("/admin/orders", "layout");
  return { ok: true };
}

const COMMISSION_STAGES = ["brief", "sculpting", "finalization", "complete", "declined"] as const;

export async function updateCommission(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { supabase, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Unknown commission." };

  const stage = z.enum(COMMISSION_STAGES).safeParse(formData.get("stage"));
  if (!stage.success) return { error: "Unknown stage." };

  const rawQuote = formData.get("quoted_kes");
  const quote =
    rawQuote === null || rawQuote === ""
      ? null
      : z.coerce.number().int("Whole shillings only.").min(0).safeParse(rawQuote);
  if (quote !== null && !quote.success) return { error: quote.error.issues[0].message };

  const { error } = await supabase
    .from("commissions")
    .update({
      stage: stage.data,
      quoted_kes: quote === null ? null : quote.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id.data);
  if (error) return { error: error.message };

  revalidatePath("/admin/commissions");
  return { ok: true };
}

export async function setMessageHandled(messageId: string, handled: boolean): Promise<AdminState> {
  const { supabase, userId, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const { error } = await supabase.from("contact_messages").update({ handled }).eq("id", messageId);
  if (error) return { error: error.message };

  await logActivity(supabase, {
    actor_id: userId,
    entity_type: "message",
    entity_id: messageId,
    action: handled ? "handled" : "reopened",
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

const priceUpdates = z
  .array(
    z.object({
      id: z.uuid(),
      // Per-NAIL price in whole KES, VAT-exclusive.
      unit_price_kes: z.number().int("Whole shillings only.").min(0).max(1_000_000),
    }),
  )
  .min(1, "Nothing to save.")
  .max(500);

/**
 * Saves many design prices at once — the catalogue launches on placeholder
 * prices, and 30 designs a month shouldn't mean 30 edit pages. Shape prices
 * left null keep inheriting from the design, so they follow automatically.
 */
export async function setPrices(updates: { id: string; unit_price_kes: number }[]): Promise<AdminState> {
  const { supabase, userId, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const parsed = priceUpdates.safeParse(updates);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: before } = await supabase
    .from("products")
    .select("id, unit_price_kes")
    .in("id", parsed.data.map((u) => u.id));
  const was = new Map((before ?? []).map((p) => [p.id, p.unit_price_kes as number]));

  const now = new Date().toISOString();
  const results = await Promise.all(
    parsed.data.map(({ id, unit_price_kes }) =>
      supabase.from("products").update({ unit_price_kes, updated_at: now }).eq("id", id),
    ),
  );
  const failed = results.filter((r) => r.error);
  const saved = parsed.data.filter((_, i) => !results[i].error && was.get(parsed.data[i].id) !== parsed.data[i].unit_price_kes);
  if (saved.length) {
    await logActivity(
      supabase,
      saved.map((u) => ({
        actor_id: userId,
        entity_type: "product" as const,
        entity_id: u.id,
        action: "price_changed",
        detail: { from_kes: was.get(u.id) ?? null, to_kes: u.unit_price_kes, bulk: true },
      })),
    );
  }
  if (failed.length) return { error: `${failed.length} of ${results.length} prices failed: ${failed[0].error!.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}

const dispatchFields = z.object({
  order_id: z.uuid(),
  courier: z.string().trim().min(2, "Who is delivering it?").max(120),
  tracking_ref: z.string().trim().max(120).optional(),
});

/**
 * The only way an order becomes 'shipped': it records the courier (and a
 * tracking number when there is one) so the customer's order page can show it.
 * Only paid or in-production orders can be dispatched.
 */
export async function dispatchOrder(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase, userId, error: auth } = await requireAdmin();
  if (auth) return { error: auth };

  const parsed = dispatchFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { order_id, courier, tracking_ref } = parsed.data;

  const { data: before } = await supabase.from("orders").select("status").eq("id", order_id).single();

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      courier,
      tracking_ref: tracking_ref || null,
      dispatched_at: new Date().toISOString(),
    })
    .eq("id", order_id)
    .in("status", ["paid", "in_production"])
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only paid or in-production orders can be dispatched." };

  await logActivity(supabase, {
    actor_id: userId,
    entity_type: "order",
    entity_id: order_id,
    action: "dispatched",
    from_status: before?.status ?? null,
    to_status: "shipped",
    note: [courier, tracking_ref].filter(Boolean).join(" · "),
  });

  revalidatePath("/admin/orders", "layout");
  revalidatePath("/account/orders");
  return { ok: true };
}
