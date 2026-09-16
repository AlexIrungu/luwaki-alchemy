"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/CartProvider";
import { filledCount } from "@/lib/cart/logic";
import { reorderSet } from "@/lib/cart/actions";

/** Rebuilds a past order's set in the cart, at today's prices. */
export function ReorderButton({ orderId }: { orderId: string }) {
  const { cart, replace } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const reorder = () =>
    start(async () => {
      if (filledCount(cart) > 0 && !window.confirm("Replace the set you're building with this order?")) return;
      const result = await reorderSet(orderId);
      if (!result || result.items.length === 0) {
        setNotice("None of these designs are on sale any more.");
        return;
      }
      replace(result.items);
      if (result.skipped.length) {
        setNotice(`Added to your set. No longer on sale: ${result.skipped.join(", ")} — choose another for those fingers.`);
      } else {
        router.push("/cart");
      }
    });

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={reorder}
        disabled={pending}
        className="font-mono text-[10px] tracking-[0.2em] text-ink-dim transition-colors hover:text-ink disabled:opacity-50"
      >
        {pending ? "REBUILDING…" : "REORDER THIS SET →"}
      </button>
      {notice && <p className="mt-2 max-w-sm text-xs text-flag">{notice}</p>}
    </div>
  );
}
