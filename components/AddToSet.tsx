"use client";

import { SHAPES, SLOTS, slotKey, slotLabel, type Shape } from "@/lib/catalogue";
import { useCart } from "@/lib/cart/CartProvider";
import { useDesignShape } from "@/components/DesignShape";

type Variant = { id: string; options: { shape?: Shape }; price_kes: number | null };

/**
 * The purchase control for a 10-slot category: pick a shape, pick a finger,
 * fill that slot. Adding to the set is per-nail, so this is a slot assignment
 * rather than a quantity.
 */
export function AddToSet({
  productSlug,
  productName,
  unitPriceKES,
  variants,
}: {
  productSlug: string;
  productName: string;
  unitPriceKES: number;
  variants: Variant[];
}) {
  const { cart, fill } = useCart();
  const { shape, setShape } = useDesignShape();

  const shaped = variants
    .filter((v): v is Variant & { options: { shape: Shape } } => Boolean(v.options.shape))
    .sort((a, b) => SHAPES.indexOf(a.options.shape) - SHAPES.indexOf(b.options.shape));
  const variant = shaped.find((v) => v.options.shape === shape);

  return (
    <div className="mt-10 space-y-8">
      <div>
        <p className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">SHAPE</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {shaped.map((v) => (
            <button
              key={v.id}
              onClick={() => setShape(v.options.shape)}
              aria-pressed={v.options.shape === shape}
              className={`border px-4 py-2 font-mono text-[11px] tracking-[0.15em] transition-colors ${
                v.options.shape === shape ? "border-ink text-ink" : "border-line text-ink-dim hover:border-ink-faint"
              }`}
            >
              {v.options.shape.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">
          FINGER — {Object.keys(cart.slots).length} of 10 filled
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {SLOTS.map((slot) => {
            const taken = cart.slots[slotKey(slot)];
            return (
              <button
                key={slotKey(slot)}
                disabled={!variant || !shape}
                onClick={() =>
                  variant &&
                  shape &&
                  fill({
                    id: crypto.randomUUID(),
                    hand: slot.hand,
                    finger: slot.finger,
                    variantId: variant.id,
                    productSlug,
                    productName,
                    shape,
                    unitPriceKES: variant.price_kes ?? unitPriceKES,
                  })
                }
                title={taken ? `Replaces ${taken.productName}` : undefined}
                className={`border px-2 py-3 font-mono text-[10px] tracking-[0.1em] transition-colors ${
                  taken ? "border-resin text-resin" : "border-line text-ink-dim hover:border-ink-faint"
                }`}
              >
                {slotLabel(slot)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
