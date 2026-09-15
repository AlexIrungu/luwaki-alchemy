/**
 * Money is integer KES everywhere — database, cart, Paystack. Never a float.
 * Paystack charges in the subunit, so the API boundary multiplies by 100.
 */

const formatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export const formatKES = (amount: number) => formatter.format(amount);

export const toPaystackSubunit = (kes: number) => Math.round(kes * 100);
