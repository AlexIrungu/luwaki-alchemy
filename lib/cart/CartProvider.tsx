"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Slot } from "@/lib/catalogue";
import { clearSlot, setSlot, subtotalKES } from "./logic";
import { EMPTY_CART, type Cart, type SlotItem } from "./types";

const STORAGE_KEY = "luwaki.cart.v1";

type CartContext = {
  cart: Cart;
  hydrated: boolean;
  fill: (item: SlotItem) => void;
  empty: (slot: Slot) => void;
  reset: () => void;
  subtotal: number;
};

const Ctx = createContext<CartContext | null>(null);

/**
 * The cart lives in localStorage until checkout, then is re-priced server-side
 * against the catalogue. A browser-held price is a suggestion, never a source
 * of truth.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCart(JSON.parse(raw) as Cart);
    } catch {
      // Private mode, or a stale shape from an older version. Start clean.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage full or blocked — the cart still works for this session.
    }
  }, [cart, hydrated]);

  const value = useMemo<CartContext>(
    () => ({
      cart,
      hydrated,
      fill: (item) => setCart((c) => setSlot(c, item)),
      empty: (slot) => setCart((c) => clearSlot(c, slot)),
      reset: () => setCart(EMPTY_CART),
      subtotal: subtotalKES(cart),
    }),
    [cart, hydrated],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
