"use client";

import Link from "next/link";
import { SLOTS, slotKey, slotLabel } from "@/lib/catalogue";
import { useCart } from "@/lib/cart/CartProvider";
import { checkoutBlocks } from "@/lib/cart/logic";
import { formatKES } from "@/lib/money";

/** CART — site map item 11. Ten placeholders; an empty slot blocks checkout. */
export function CartView({ signedIn, measured }: { signedIn: boolean; measured: number }) {
  const { cart, empty, subtotal, hydrated } = useCart();
  if (!hydrated) return <div className="min-h-screen px-6 pt-40" />;

  const blocks = checkoutBlocks(cart, { signedIn, measured });

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-5xl tracking-[0.2em]">CART</h1>

        <ul className="mt-12 divide-y divide-line-soft border-y border-line-soft">
          {SLOTS.map((slot) => {
            const item = cart.slots[slotKey(slot)];
            return (
              <li key={slotKey(slot)} className="flex items-center gap-4 py-4">
                <span className="w-24 font-mono text-[10px] tracking-[0.2em] text-ink-faint">
                  {slotLabel(slot).toUpperCase()}
                </span>
                {item ? (
                  <>
                    <span className="flex-1 font-display text-xl">{item.productName}</span>
                    <span className="font-mono text-[11px] text-ink-dim">
                      {item.shape.toUpperCase()}
                    </span>
                    <span className="w-24 text-right font-mono text-sm">
                      {formatKES(item.unitPriceKES)}
                    </span>
                    <button
                      onClick={() => empty(slot)}
                      className="font-mono text-[10px] text-ink-faint hover:text-danger"
                    >
                      REMOVE
                    </button>
                  </>
                ) : (
                  <Link href="/collections" className="flex-1 text-sm text-ink-faint hover:text-ink-dim">
                    Empty — choose a design
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex justify-between font-mono text-sm">
          <span className="text-ink-dim">SUBTOTAL</span>
          <span>{formatKES(subtotal)}</span>
        </div>

        {blocks.length > 0 && (
          <ul className="mt-8 space-y-2 border border-line bg-panel p-5 font-mono text-[11px] text-ink-dim">
            {blocks.map((block) => (
              <li key={block.reason}>
                {block.reason === "incomplete_set" &&
                  `${block.missing.length} slot${block.missing.length === 1 ? "" : "s"} still empty — a set is ten nails.`}
                {block.reason === "no_account" && (
                  <>
                    An account is required to order — we print to your measurements.{" "}
                    <Link href="/sign-in?next=/cart" className="text-resin underline">Sign in</Link>
                  </>
                )}
                {block.reason === "missing_measurements" && (
                  <>
                    {`Nail measurements incomplete (${block.measured} of 10). `}
                    <Link href="/account/measurements" className="text-resin underline">Add them</Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/checkout"
          aria-disabled={blocks.length > 0}
          className={`mt-8 block border py-4 text-center font-mono text-[11px] tracking-[0.25em] ${
            blocks.length > 0
              ? "pointer-events-none border-line text-ink-faint"
              : "border-ink text-ink hover:bg-ink hover:text-ground"
          }`}
        >
          CHECKOUT
        </Link>
      </div>
    </div>
  );
}
