/**
 * Pure cart rules — no React, no Supabase, so they can be unit-tested and
 * re-used by the server at checkout. The server MUST re-run `canCheckout`
 * against trusted data; the client copy is a UX affordance, not the gate.
 */

import { SLOTS, slotKey, type Slot } from "@/lib/catalogue";
import { EMPTY_CART, type Cart, type SlotItem } from "./types";

export const setSlot = (cart: Cart, item: SlotItem): Cart => ({
  ...cart,
  slots: { ...cart.slots, [slotKey(item)]: item },
});

export const clearSlot = (cart: Cart, slot: Slot): Cart => {
  const slots = { ...cart.slots };
  delete slots[slotKey(slot)];
  return { ...cart, slots };
};

export const getSlot = (cart: Cart, slot: Slot): SlotItem | undefined =>
  cart.slots[slotKey(slot)];

export const emptySlots = (cart: Cart): Slot[] =>
  SLOTS.filter((slot) => !cart.slots[slotKey(slot)]);

export const filledCount = (cart: Cart) => Object.keys(cart.slots).length;

/** Sum of the ten slots plus any spares. Per-nail pricing, so it is a sum. */
export const subtotalKES = (cart: Cart) =>
  Object.values(cart.slots).reduce((sum, item) => sum + item.unitPriceKES, 0) +
  cart.extras.reduce((sum, item) => sum + item.unitPriceKES, 0);

export type CheckoutBlock =
  | { reason: "incomplete_set"; missing: Slot[] }
  | { reason: "no_account" }
  | { reason: "missing_measurements"; measured: number };

/**
 * Everything standing between this cart and Paystack. Returns an empty array
 * when checkout may proceed.
 *
 * `measured` is the count of fingers on file (0–10). Sizes are production
 * data: without all ten the workshop cannot print the order, so this blocks
 * checkout exactly as hard as an empty slot does.
 */
export function checkoutBlocks(
  cart: Cart,
  ctx: { signedIn: boolean; measured: number },
): CheckoutBlock[] {
  const blocks: CheckoutBlock[] = [];
  const missing = emptySlots(cart);

  if (missing.length > 0) blocks.push({ reason: "incomplete_set", missing });
  if (!ctx.signedIn) blocks.push({ reason: "no_account" });
  else if (ctx.measured < 10) blocks.push({ reason: "missing_measurements", measured: ctx.measured });

  return blocks;
}

export const canCheckout = (cart: Cart, ctx: { signedIn: boolean; measured: number }) =>
  checkoutBlocks(cart, ctx).length === 0;

export { EMPTY_CART };
