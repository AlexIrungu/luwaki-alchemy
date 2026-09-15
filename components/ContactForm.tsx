"use client";

import { useActionState } from "react";
import { sendMessage, type ContactState } from "@/app/contact/actions";

const field =
  "w-full border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint";
const label = "font-mono text-[10px] tracking-[0.25em] text-ink-faint";

export function ContactForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendMessage, {});

  if (state.ok) {
    return (
      <p className="mt-12 border border-line bg-panel p-5 text-sm text-ink-dim">
        Thank you — we have your message and will reply by email.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-12 space-y-6">
      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px]"
      />

      <div className="space-y-2">
        <label className={label} htmlFor="name">NAME</label>
        <input id="name" name="name" defaultValue={defaultName} required className={field} />
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="email">EMAIL</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
          className={field}
        />
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="message">MESSAGE</label>
        <textarea id="message" name="message" rows={6} required minLength={10} className={field} />
      </div>

      {state.error && (
        <p role="alert" className="font-mono text-[11px] text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="border border-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] hover:bg-ink hover:text-ground disabled:opacity-50"
      >
        {pending ? "…" : "SEND"}
      </button>
    </form>
  );
}
