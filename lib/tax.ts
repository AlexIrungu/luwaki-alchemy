/**
 * Prices on the site are VAT-exclusive (client, 2026-09-15): the catalogue holds
 * the net per-nail price and VAT is added at checkout. Kenya's standard rate is
 * 16%.
 *
 * Integer KES, rounded once on the order's VAT line — never per nail, or ten
 * rounded nails drift from the true total.
 */
export const VAT_RATE = 0.16;
export const VAT_LABEL = "VAT (16%)";

export const vatKES = (net: number) => Math.round(net * VAT_RATE);

/** The one place an order's money is added up — server checkout and every summary use it. */
export function orderTotals(subtotal: number, shipping: number) {
  const net = subtotal + shipping;
  const vat = vatKES(net);
  return { subtotal, shipping, vat, total: net + vat };
}
