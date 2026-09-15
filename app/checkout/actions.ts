"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { FINGERS, HANDS, SLOTS, slotKey } from "@/lib/catalogue";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { newReference, shippingKES, type MeasurementSnapshot } from "@/lib/orders";
import { orderTotals } from "@/lib/tax";
import { payments } from "@/lib/payments/provider";

export type CheckoutState = { error?: string };

const submitted = z.object({
  slots: z
    .array(z.object({
      hand: z.enum(HANDS),
      finger: z.enum(FINGERS),
      variantId: z.uuid(),
    }))
    .length(10, "A set is ten nails."),
  packaging: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

/** Where the set goes. Collected at checkout, snapshotted onto the order. */
const delivery = z.object({
  name: z.string().trim().min(2, "Who should we deliver to?"),
  phone: z.string().trim().min(7, "A phone number for the courier."),
  county: z.string().trim().min(2, "Which county?"),
  town: z.string().trim().min(2, "Which town or area?"),
  address: z.string().trim().min(4, "Street, building or a landmark."),
});

/**
 * The only path from cart to order.
 *
 * Nothing the browser sends about money is trusted: it submits which variant
 * sits on which finger, and every price is read back from the catalogue here.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "That cart could not be read. Try again." };
  }

  const parsed = submitted.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { slots } = parsed.data;
  const packaging = String(formData.get("packaging") ?? "") || parsed.data.packaging;
  const notes = String(formData.get("notes") ?? "") || parsed.data.notes;

  const address = delivery.safeParse({
    name: formData.get("delivery_name"),
    phone: formData.get("delivery_phone"),
    county: formData.get("delivery_county"),
    town: formData.get("delivery_town"),
    address: formData.get("delivery_address"),
  });
  if (!address.success) return { error: address.error.issues[0].message };

  // Exactly one design per finger, all ten fingers present.
  const keys = new Set(slots.map(slotKey));
  if (keys.size !== 10 || SLOTS.some((slot) => !keys.has(slotKey(slot)))) {
    return { error: "Every finger needs exactly one design." };
  }

  // --- Trusted prices -------------------------------------------------------
  const { data: variants, error: variantError } = await supabase
    .from("product_variants")
    .select("id, options, price_kes, is_published, products(id, name, unit_price_kes, is_published)")
    .in("id", [...new Set(slots.map((s) => s.variantId))])
    .returns<{
      id: string;
      options: Record<string, string>;
      price_kes: number | null;
      is_published: boolean;
      products: { id: string; name: string; unit_price_kes: number; is_published: boolean } | null;
    }[]>();

  if (variantError) return { error: variantError.message };

  const priced = new Map(variants?.map((v) => [v.id, v]));
  for (const slot of slots) {
    const variant = priced.get(slot.variantId);
    if (!variant || !variant.is_published || !variant.products?.is_published) {
      return { error: "One of these designs is no longer available. Please review your cart." };
    }
  }

  // --- Measurements ---------------------------------------------------------
  const { data: rows } = await supabase
    .from("measurements")
    .select("hand, finger, width_mm")
    .eq("profile_id", user.id);

  if ((rows?.length ?? 0) !== 10) {
    return { error: "We need all ten measurements before this can be printed." };
  }

  const measurements: MeasurementSnapshot = Object.fromEntries(
    rows!.map((r) => [`${r.hand}-${r.finger}`, Number(r.width_mm)]),
  );

  // --- Order ----------------------------------------------------------------
  const items = slots.map((slot) => {
    const variant = priced.get(slot.variantId)!;
    return {
      variant_id: variant.id,
      slot_hand: slot.hand,
      slot_finger: slot.finger,
      qty: 1,
      product_name: variant.products!.name,
      options: variant.options,
      unit_price_kes: variant.price_kes ?? variant.products!.unit_price_kes,
    };
  });

  // VAT is added on top of the net prices (VAT-exclusive catalogue).
  const { subtotal, shipping, vat, total } = orderTotals(
    items.reduce((sum, item) => sum + item.unit_price_kes, 0),
    shippingKES(),
  );
  const reference = newReference();

  // Customers have no insert policy on `orders` by design — an order is
  // written on their behalf, never by them.
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      profile_id: user.id,
      reference,
      status: "pending_payment",
      subtotal_kes: subtotal,
      shipping_kes: shipping,
      vat_kes: vat,
      total_kes: total,
      shipping_address: address.data,
      measurements,
      packaging: packaging || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (orderError) return { error: orderError.message };

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(items.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    // A half-written order would reach the workshop missing nails. Remove it.
    await admin.from("orders").delete().eq("id", order.id);
    return { error: itemsError.message };
  }

  let authorizationUrl: string;
  try {
    ({ authorizationUrl } = await payments.initialise({
      reference,
      amountKES: total,
      email: user.email!,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?reference=${reference}`,
    }));
  } catch (error) {
    await admin.from("orders").delete().eq("id", order.id);
    return { error: error instanceof Error ? error.message : "Could not start payment." };
  }

  redirect(authorizationUrl);
}
