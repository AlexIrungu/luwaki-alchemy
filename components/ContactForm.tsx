"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { sendMessage, type ContactState } from "@/app/contact/actions";
import { CONTACT_TOPICS, REPLY_PROMISE, type ContactTopicKey } from "@/lib/contact";

const field =
  "w-full border border-line bg-ground px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint";
const label = "font-mono text-[10px] tracking-[0.25em] text-ink-faint";

export type ContactOrder = { id: string; reference: string; status: string };

const PLACEHOLDER: Record<ContactTopicKey, string> = {
  order: "What's happening with your order?",
  sizing: "Which fingers are you unsure about?",
  shipping: "Where should your set go, and by when?",
  "private-edit": "",
  collaboration: "Who you are and what you have in mind.",
  other: "How can we help?",
};

export function ContactForm({
  defaultName,
  defaultEmail,
  signedIn,
  orders,
}: {
  defaultName: string;
  defaultEmail: string;
  signedIn: boolean;
  orders: ContactOrder[];
}) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendMessage, {});
  const [topic, setTopic] = useState<ContactTopicKey>("order");

  if (state.ok) {
    return (
      <div className="border border-line bg-panel p-8">
        <span aria-hidden="true" className="block h-1.5 w-16 bg-ink" />
        <p className="mt-6 font-display text-3xl">Thank you — message received.</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">{REPLY_PROMISE} Keep an eye on your email.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8 border border-line bg-panel p-6 sm:p-8">
      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px]" />

      <fieldset>
        <legend className={label}>WHAT IS IT ABOUT?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONTACT_TOPICS.map((t) => (
            <label key={t.key} className="cursor-pointer">
              <input
                type="radio"
                name="topic"
                value={t.key}
                checked={topic === t.key}
                onChange={() => setTopic(t.key)}
                className="peer sr-only"
              />
              <span className="block border border-line px-4 py-2 text-sm text-ink-dim transition-colors hover:border-ink-faint peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ground peer-focus-visible:ring-2 peer-focus-visible:ring-resin">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {topic === "private-edit" ? (
        <div className="border-l-4 border-gold pl-5">
          <p className="font-display text-2xl">Bespoke work starts with a brief.</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            A Private Edit takes your idea through sculpting to a finished set, with your details and sizes pulled from your
            account — no need to write them out here.
          </p>
          <Link
            href="/private-edit"
            className="mt-5 inline-block border border-ink px-8 py-3 font-mono text-[11px] tracking-[0.25em] hover:bg-ink hover:text-ground"
          >
            START A PRIVATE EDIT →
          </Link>
        </div>
      ) : (
        <>
          {topic === "order" &&
            (signedIn ? (
              orders.length > 0 ? (
                <div className="space-y-2">
                  <label className={label} htmlFor="order_id">WHICH ORDER?</label>
                  <select id="order_id" name="order_id" defaultValue={orders[0].id} className={field}>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.reference} — {o.status.replace(/_/g, " ")}
                      </option>
                    ))}
                    <option value="">Not about a specific order</option>
                  </select>
                </div>
              ) : (
                <p className="text-sm text-ink-dim">There are no orders on your account yet.</p>
              )
            ) : (
              <p className="text-sm text-ink-dim">
                <Link href="/sign-in?next=/contact" className="text-resin underline">Sign in</Link> to link the order you're writing
                about — we'll see its details straight away.
              </p>
            ))}

          {topic === "sizing" && (
            <p className="border-l-4 border-turquoise pl-4 text-sm leading-relaxed text-ink-dim">
              Most sizing questions are answered in the{" "}
              <Link href="/account/measurements" className="text-resin underline">how-to-measure guide</Link>. Still unsure? Tell us
              which fingers.
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={label} htmlFor="name">NAME</label>
              <input id="name" name="name" defaultValue={defaultName} required autoComplete="name" className={field} />
            </div>
            <div className="space-y-2">
              <label className={label} htmlFor="email">EMAIL</label>
              <input id="email" name="email" type="email" defaultValue={defaultEmail} required autoComplete="email" className={field} />
            </div>
          </div>

          <div className="space-y-2">
            <label className={label} htmlFor="message">MESSAGE</label>
            <textarea
              id="message"
              name="message"
              rows={6}
              required
              minLength={10}
              placeholder={PLACEHOLDER[topic]}
              className={field}
            />
          </div>

          {state.error && <p role="alert" className="font-mono text-[11px] text-danger">{state.error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-ink-faint">{REPLY_PROMISE}</p>
            <button
              type="submit"
              disabled={pending}
              className="border border-ink bg-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] text-ground hover:opacity-80 disabled:opacity-50"
            >
              {pending ? "SENDING…" : "SEND MESSAGE"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
