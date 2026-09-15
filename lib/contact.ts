/**
 * CONTACT page content. Channels and answers the client still has to confirm
 * are marked; the page shows them as DRAFT COPY until then.
 */

export const CONTACT_TOPICS = [
  { key: "order", label: "An order" },
  { key: "sizing", label: "Sizing" },
  { key: "shipping", label: "Delivery" },
  { key: "private-edit", label: "Private Edit" },
  { key: "collaboration", label: "Collaboration & press" },
  { key: "other", label: "Something else" },
] as const;

export type ContactTopicKey = (typeof CONTACT_TOPICS)[number]["key"];
/** Topics stored on a message. "private-edit" is routed to the commission flow instead. */
export const STORED_TOPICS = ["order", "sizing", "shipping", "collaboration", "other"] as const;
export type StoredTopic = (typeof STORED_TOPICS)[number];

export const TOPIC_LABEL: Record<string, string> = Object.fromEntries(CONTACT_TOPICS.map((t) => [t.key, t.label]));

/**
 * WhatsApp number in international format without "+", e.g. "2547XXXXXXXX".
 * null until the client sends it — the channel is hidden while null.
 * Email waits for the domain (and Resend).
 */
export const WHATSAPP_NUMBER: string | null = null;
export const CONTACT_EMAIL: string | null = null;

/** DRAFT COPY — reply hours to confirm with the client. */
export const REPLY_PROMISE = "We reply within one working day.";

/** DRAFT COPY — every answer needs the client's confirmation (lead time, delivery, returns are open questions). */
export const CONTACT_FAQ: { q: string; a: string }[] = [
  {
    q: "How do I get my size?",
    a: "Measure each of your ten nails once, following the guide on your account. Every nail in your set is printed to the width of the finger it's for.",
  },
  {
    q: "How long does a set take?",
    a: "Every set is printed to order. We confirm the lead time when your order goes into production.",
  },
  {
    q: "Where do you deliver?",
    a: "Across Kenya. The delivery cost is confirmed with you before your set is dispatched.",
  },
  {
    q: "What if a nail doesn't fit?",
    a: "Your set is made to your measurements, so it can't be resold. If a nail doesn't fit or arrives damaged, message us within 7 days with your order and we'll make it right.",
  },
  {
    q: "Can you make a design just for me?",
    a: "Yes — that's a Private Edit. Share your idea and we sculpt it with you.",
  },
];

/** Kenyan numbers as typed (0712…, +254 712…) → wa.me format (254712…). */
export function whatsappDigits(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}
