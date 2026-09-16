"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { slotKey, type Slot } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/client";
import { clearSlot, setSlot, subtotalKES } from "./logic";
import { loadSavedSet, saveSet } from "./actions";
import { EMPTY_CART, type Cart, type SlotItem } from "./types";

const STORAGE_KEY = "luwaki.cart.v1";
/** Quiet time after the last change before the set is saved to the account. */
const SAVE_AFTER_MS = 800;

type CartContext = {
  cart: Cart;
  hydrated: boolean;
  fill: (item: SlotItem) => void;
  empty: (slot: Slot) => void;
  /** Swaps the whole set for these slots (reorder). */
  replace: (items: SlotItem[]) => void;
  reset: () => void;
  subtotal: number;
};

const Ctx = createContext<CartContext | null>(null);

/**
 * The cart lives in localStorage until checkout, then is re-priced server-side
 * against the catalogue. A browser-held price is a suggestion, never a source
 * of truth.
 *
 * Signed in, the set also follows the account between devices. On first load
 * the saved set is merged in — this browser's filled fingers win, the saved set
 * fills the gaps — and every change after that is saved back.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  // True once the saved set has been merged in; nothing is saved before then,
  // or an empty browser cart would wipe the account's set.
  const [synced, setSynced] = useState(false);
  const syncing = useRef(false);
  const pathname = usePathname();

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

  // Checked on every navigation until it succeeds, so signing in mid-visit
  // (a server action and a client-side redirect) still picks the set up. The
  // session check reads the auth cookie; it doesn't touch the network.
  useEffect(() => {
    if (!hydrated || synced || syncing.current) return;
    syncing.current = true;
    (async () => {
      try {
        const { data } = await createClient().auth.getSession();
        if (!data.session) return;
        const saved = await loadSavedSet();
        if (!saved) return;
        setCart((current) => ({
          ...current,
          slots: { ...Object.fromEntries(saved.items.map((item) => [slotKey(item), item])), ...current.slots },
        }));
        setSynced(true);
      } catch {
        // Offline or the action failed: the browser cart still works, and the next navigation tries again.
      } finally {
        syncing.current = false;
      }
    })();
  }, [hydrated, synced, pathname]);

  useEffect(() => {
    if (!synced) return;
    const refs = Object.values(cart.slots).map(({ hand, finger, variantId }) => ({ hand, finger, variantId }));
    const timer = window.setTimeout(() => {
      saveSet(refs).catch(() => {});
    }, SAVE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [cart.slots, synced]);

  const value = useMemo<CartContext>(
    () => ({
      cart,
      hydrated,
      fill: (item) => setCart((c) => setSlot(c, item)),
      empty: (slot) => setCart((c) => clearSlot(c, slot)),
      replace: (items) =>
        setCart((c) => ({ ...c, slots: Object.fromEntries(items.map((item) => [slotKey(item), item])) })),
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
