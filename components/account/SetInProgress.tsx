"use client";

import Link from "next/link";
import { SLOTS, slotKey, type Slot } from "@/lib/catalogue";
import { useCart } from "@/lib/cart/CartProvider";
import { filledCount } from "@/lib/cart/logic";
import { designHref, shapeStillSrc } from "@/lib/hero";
import { formatKES } from "@/lib/money";

const LEFT = SLOTS.filter((s) => s.hand === "left");
const RIGHT = SLOTS.filter((s) => s.hand === "right");

/** The set being built, as two hands of five. Reads the browser cart. */
export function SetInProgress() {
  const { cart, hydrated, subtotal } = useCart();
  if (!hydrated) return <div className="h-48" />;

  const filled = filledCount(cart);

  if (filled === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 border border-line p-6">
        <p className="text-sm text-ink-dim">No set in progress. Ten nails, a design for every finger.</p>
        <Link href="/collections" className="font-mono text-[11px] tracking-[0.2em] text-ink hover:text-resin">
          START A SET →
        </Link>
      </div>
    );
  }

  const hand = (slots: Slot[], label: string) => (
    <div>
      <p className="font-mono text-[9px] tracking-[0.25em] text-ink-faint">{label}</p>
      <ul className="mt-2 grid grid-cols-5 gap-2">
        {slots.map((slot) => {
          const item = cart.slots[slotKey(slot)];
          return (
            <li key={slotKey(slot)}>
              {item ? (
                <Link
                  href={designHref(item.productSlug, item.shape)}
                  title={`${item.productName} — ${item.shape}`}
                  className="block aspect-[3/4] border border-line bg-panel transition-colors hover:border-ink-faint"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static shape tiles */}
                  <img src={shapeStillSrc(item.productSlug, item.shape)} alt={item.productName} className="h-full w-full object-contain p-1" />
                </Link>
              ) : (
                <Link
                  href="/collections"
                  aria-label={`Choose a design for ${slot.hand} ${slot.finger}`}
                  className="block aspect-[3/4] border border-dashed border-line transition-colors hover:border-ink-faint"
                />
              )}
              <p className="mt-1 truncate text-center font-mono text-[8px] tracking-[0.15em] text-ink-faint">
                {slot.finger.toUpperCase()}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="border border-line p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {hand(LEFT, "LEFT HAND")}
        {hand(RIGHT, "RIGHT HAND")}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-4">
        <p className="font-mono text-[11px] text-ink-dim">
          {filled} OF 10 · {formatKES(subtotal)} <span className="text-ink-faint">EXCL. VAT</span>
        </p>
        <Link href="/cart" className="font-mono text-[11px] tracking-[0.2em] text-ink hover:text-resin">
          {filled === 10 ? "CHECKOUT →" : "CONTINUE →"}
        </Link>
      </div>
    </div>
  );
}
