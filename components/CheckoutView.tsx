"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SLOTS, slotKey, slotLabel } from "@/lib/catalogue";
import { useCart } from "@/lib/cart/CartProvider";
import { formatKES } from "@/lib/money";
import { heroSrc } from "@/lib/hero";
import { VAT_LABEL, orderTotals } from "@/lib/tax";
import { startCheckout, type CheckoutState } from "@/app/checkout/actions";

/**
 * Packaging options are a placeholder — the brief lists a packaging choice and
 * nail-prep add-ons, but neither the options nor their prices have come back
 * from the client. Priced add-ons need a line-item model before they ship.
 */
const PACKAGING = ["Standard", "Gift box"];

const field =
  "w-full border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint";
const label = "font-mono text-[10px] tracking-[0.25em] text-ink-faint";

export function CheckoutView({
  email,
  live,
  defaults,
}: {
  email: string;
  live: boolean;
  defaults: { name: string; phone: string };
}) {
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
  // server-side, and VAT is recomputed there too. These totals are a preview.
  const payload = JSON.stringify({
    slots: filled.map((slot) => ({
      hand: slot.hand,
      finger: slot.finger,
      variantId: cart.slots[slotKey(slot)].variantId,
    })),
  });
  const totals = orderTotals(subtotal, 0);

  return (
    <div className="px-6 pb-24 pt-40">
      <form action={formAction} className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1fr_24rem]">
        <input type="hidden" name="payload" value={payload} />

        <div>
          <h1 className="font-display text-4xl tracking-[0.15em]">CHECKOUT</h1>
          <p className="mt-3 font-mono text-[11px] text-ink-faint">{email}</p>

          <fieldset className="mt-12 space-y-6">
            <legend className="font-display text-2xl tracking-[0.1em]">Delivery</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className={label} htmlFor="delivery_name">FULL NAME</label>
                <input id="delivery_name" name="delivery_name" defaultValue={defaults.name} required autoComplete="name" className={field} />
              </div>
              <div className="space-y-2">
                <label className={label} htmlFor="delivery_phone">PHONE</label>
                <input id="delivery_phone" name="delivery_phone" type="tel" defaultValue={defaults.phone} required autoComplete="tel" className={field} />
              </div>
              <div className="space-y-2">
                <label className={label} htmlFor="delivery_county">COUNTY</label>
                <input id="delivery_county" name="delivery_county" required placeholder="Nairobi" className={field} />
              </div>
              <div className="space-y-2">
                <label className={label} htmlFor="delivery_town">TOWN / AREA</label>
                <input id="delivery_town" name="delivery_town" required placeholder="Westlands" className={field} />
              </div>
            </div>
            <div className="space-y-2">
              <label className={label} htmlFor="delivery_address">ADDRESS</label>
              <input
                id="delivery_address"
                name="delivery_address"
                required
                autoComplete="street-address"
                placeholder="Street, building, floor or a landmark"
                className={field}
              />
            </div>
          </fieldset>

          <fieldset className="mt-12 space-y-6">
            <legend className="font-display text-2xl tracking-[0.1em]">Your set</legend>
            <div className="space-y-2">
              <label className={label} htmlFor="packaging">PACKAGING</label>
              <select id="packaging" name="packaging" className={field}>
                {PACKAGING.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={label} htmlFor="notes">ANYTHING WE SHOULD KNOW</label>
              <textarea id="notes" name="notes" rows={3} className={field} />
            </div>
          </fieldset>
        </div>

        <aside className="h-fit border border-line bg-panel p-6 lg:sticky lg:top-32">
          <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">ORDER SUMMARY</h2>
          <ul className="mt-4 divide-y divide-line-soft">
            {filled.map((slot) => {
              const item = cart.slots[slotKey(slot)];
              return (
                <li key={slotKey(slot)} className="flex items-center gap-3 py-2 text-sm">
                  <span className="block aspect-[3/4] w-7 shrink-0 overflow-hidden border border-line bg-ground">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static stills shared with the hero shader */}
                    <img src={heroSrc(item.productSlug)} alt="" className="h-full w-full scale-125 object-cover" />
                  </span>
                  <span className="w-12 font-mono text-[9px] tracking-[0.1em] text-ink-faint">
                    {slotLabel(slot).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">{item.productName}</span>
                  <span className="font-mono text-[10px] text-ink-dim">{formatKES(item.unitPriceKES)}</span>
                </li>
              );
            })}
          </ul>

          <dl className="mt-6 space-y-2 border-t border-line pt-4 font-mono text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-dim">SUBTOTAL</dt>
              <dd>{formatKES(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-dim">SHIPPING</dt>
              <dd className="text-ink-faint">Confirmed before dispatch</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-dim">{VAT_LABEL.toUpperCase()}</dt>
              <dd>{formatKES(totals.vat)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-sm">
              <dt>TOTAL</dt>
              <dd>{formatKES(totals.total)}</dd>
            </div>
          </dl>

          {state.error && (
            <p role="alert" className="mt-5 font-mono text-[11px] text-danger">{state.error}</p>
          )}

          {!live && (
            <p className="mt-5 border border-flag/40 p-3 font-mono text-[10px] text-flag">
              TEST MODE — no payment is taken. Paystack keys are not configured.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-5 w-full border border-ink py-4 font-mono text-[11px] tracking-[0.25em] transition-colors hover:bg-ink hover:text-ground disabled:opacity-50"
          >
            {pending ? "…" : live ? `PAY ${formatKES(totals.total)}` : "PLACE TEST ORDER"}
          </button>
          <p className="mt-3 text-center font-mono text-[9px] tracking-[0.15em] text-ink-faint">
            PRINTED TO THE MEASUREMENTS ON YOUR ACCOUNT
          </p>
        </aside>
      </form>
    </div>
  );
}
