import type { Finger, Hand, Shape } from "@/lib/catalogue";

/** One filled slot: a design, in a shape, on a specific finger, at its price. */
export type SlotItem = {
  id: string;
  hand: Hand;
  finger: Finger;
  variantId: string;
  productSlug: string;
  productName: string;
  shape: Shape;
  /** Price of this ONE nail, in whole KES. */
  unitPriceKES: number;
  imageUrl?: string;
};

export type Cart = {
  /** Sparse by design — a set is only complete when all ten keys are present. */
  slots: Record<string, SlotItem>;
  /** Spare nails for breakages. Priced like any other slot item. */
  extras: SlotItem[];
  packaging?: string;
  prepAddOns: string[];
};

export const EMPTY_CART: Cart = { slots: {}, extras: [], prepAddOns: [] };
