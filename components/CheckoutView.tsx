"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SLOTS, slotKey, slotLabel } from "@/lib/catalogue";
import { useCart } from "@/lib/cart/CartProvider";
import { formatKES } from "@/lib/money";
import { startCheckout, type CheckoutState } from "@/app/checkout/actions";

/**
 * Packaging options are a placeholder — the brief lists a packaging choice and
 * nail-prep add-ons, but neither the options nor their prices have come back
 * from the client. Priced add-ons need a line-item model before they ship.
 */
const PACKAGING = ["Standard", "Gift box"];

export function CheckoutView({ email, live }: { email: string; live: boolean }) {
  const { cart, subtotal, hydrated } = useCart();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});

  if (!hydrated) return <div className="min-h-screen px-6 pt-40" />;

  const filled = SLOTS.filter((slot) => cart.slots[slotKey(slot)]);

  if (filled.length < 10) {
    return (
      <div className="px-6 pb-24 pt-40">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl tracking-[0.15em]">CHECKOUT</h1>
          <p className="mt-6 text-sm text-ink-dim">
            A set is ten nails, and {10 - filled.length} of yours are still empty.
          </p>
          <Link href="/cart" className="mt-6 inline-block font-mono text-[11px] text-resin underline">
            BACK TO CART
          </Link>
        </div>
      </div>
    );
  }

  // Only the slot assignments travel — every price is read from the catalogue
  // server-side.
  const payload = JSON.stringify({
    slots: filled.map((slot) => ({
      hand: slot.hand,
      finger: slot.finger,
      variantId: cart.slots[slotKey(slot)].variantId,
    })),
  });

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl tracking-[0.15em]">CHECKOUT</h1>
        <p className="mt-3 font-mono text-[11px] text-ink-faint">{email}</p>

        <ul className="mt-10 divide-y divide-line-soft border-y border-line-soft">
          {filled.map((slot) => {
            const item = cart.slots[slotKey(slot)];
            return (
              <li key={slotKey(slot)} className="flex items-center gap-4 py-3 text-sm">
                <span className="w-24 font-mono text-[10px] tracking-[0.15em] text-ink-faint">
                  {slotLabel(slot).toUpperCase()}
                </span>
                <span className="flex-1">{item.productName}</span>
                <span className="font-mono text-[10px] text-ink-dim">
                  {item.shape.toUpperCase()}
                </span>
                <span className="w-24 text-right font-mono text-[11px]">
                  {formatKES(item.unitPriceKES)}
                </span>
              </li>
            );
          })}
        </ul>

        <form action={formAction} className="mt-8 space-y-6">
          <input type="hidden" name="payload" value={payload} />

          <div className="space-y-2">
            <label className="font-mono text-[10px] tracking-[0.25em] text-ink-faint" htmlFor="packaging">
              PACKAGING
            </label>
            <select
              id="packaging"
              name="packaging"
              className="w-full border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-ink-faint"
            >
              {PACKAGING.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[10px] tracking-[0.25em] text-ink-faint" htmlFor="notes">
              ANYTHING WE SHOULD KNOW
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-ink-faint"
            />
          </div>

          <div className="flex justify-between border-t border-line pt-5 font-mono text-sm">
            <span className="text-ink-dim">TOTAL</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <p className="font-mono text-[10px] text-ink-faint">
            Shipping is confirmed with you before dispatch.
          </p>

          {state.error && (
            <p role="alert" className="font-mono text-[11px] text-danger">{state.error}</p>
          )}

          {!live && (
            <p className="border border-flag/40 p-3 font-mono text-[10px] text-flag">
              TEST MODE — no payment is taken. Paystack keys are not configured.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full border border-ink py-4 font-mono text-[11px] tracking-[0.25em] hover:bg-ink hover:text-ground disabled:opacity-50"
          >
            {pending ? "…" : live ? "PAY WITH PAYSTACK" : "PLACE TEST ORDER"}
          </button>
        </form>
      </div>
    </div>
  );
}
