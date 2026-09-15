/**
 * Payment provider boundary.
 *
 * Lucy registered the business in September 2026 and Paystack needs the
 * verified entity, so live keys arrive last. The Paystack implementation below
 * is real and complete; when `PAYSTACK_SECRET_KEY` is absent the stub takes
 * over so the whole checkout → order → production-queue path is testable now.
 * Going live is setting two env vars — no code change.
 */

import { toPaystackSubunit } from "@/lib/money";

export type InitialisePayment = {
  reference: string;
  amountKES: number;
  email: string;
  callbackUrl: string;
};

export type PaymentProvider = {
  name: string;
  /** Where to send the customer to pay. */
  initialise(input: InitialisePayment): Promise<{ authorizationUrl: string }>;
  /** Server-side confirmation. Never trust the browser's word for this. */
  verify(reference: string): Promise<{ paid: boolean; amountKES: number }>;
};

const paystack: PaymentProvider = {
  name: "paystack",

  async initialise({ reference, amountKES, email, callbackUrl }) {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: toPaystackSubunit(amountKES),
        currency: "KES",
        reference,
        callback_url: callbackUrl,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.status) {
      throw new Error(body.message ?? "Paystack could not start this payment.");
    }
    return { authorizationUrl: body.data.authorization_url as string };
  },

  async verify(reference) {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
    );

    const body = await response.json();
    if (!response.ok || !body.status) return { paid: false, amountKES: 0 };

    return {
      paid: body.data.status === "success",
      amountKES: Math.round((body.data.amount ?? 0) / 100),
    };
  },
};

/**
 * Development stand-in. Sends the customer to a local page that completes the
 * order, so the production queue can be exercised before Paystack is live.
 */
const stub: PaymentProvider = {
  name: "stub",
  async initialise({ reference }) {
    return { authorizationUrl: `/checkout/success?reference=${encodeURIComponent(reference)}&simulated=1` };
  },
  async verify() {
    return { paid: true, amountKES: 0 };
  },
};

export const isLive = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

export const payments: PaymentProvider = isLive() ? paystack : stub;
