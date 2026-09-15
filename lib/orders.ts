import type { Hand, Finger } from "@/lib/catalogue";

/** Widths in millimetres, keyed "left-thumb". Snapshotted onto every order. */
export type MeasurementSnapshot = Record<string, number>;

/** What the browser submits at checkout. Prices are deliberately absent. */
export type SubmittedSlot = { hand: Hand; finger: Finger; variantId: string };

/**
 * Shipping is not yet scoped with the client — Kenya only or international,
 * and the lead time on a printed set, are both still open. Until then every
 * order ships at zero and the question stays visible here rather than being
 * silently answered by a hardcoded number somewhere in checkout.
 */
export const shippingKES = () => 0;

export const newReference = () =>
  `LUW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
