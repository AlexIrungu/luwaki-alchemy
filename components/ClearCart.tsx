"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/CartProvider";

/** Empties the ten slots once an order is confirmed paid. */
export function ClearCart() {
  const { reset } = useCart();
  useEffect(() => { reset(); }, [reset]);
  return null;
}
