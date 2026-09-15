"use client";

import { useActionState } from "react";
import { subscribe, type NewsletterState } from "@/app/newsletter/actions";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(subscribe, {});

  if (state.ok) {
    return (
      <p className="font-mono text-[11px] tracking-[0.25em] text-ink-dim" role="status">
        YOU&rsquo;RE ON THE LIST.
      </p>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-md">
      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px]"
      />
      <div className="flex items-center rounded-full border border-ink-faint p-1.5 pl-6 transition-colors focus-within:border-ink">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="ENTER YOUR EMAIL"
          className="min-w-0 flex-1 bg-transparent font-mono text-[11px] tracking-[0.2em] text-ink outline-none placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Subscribe"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-panel-2 text-ink transition-colors hover:bg-ink hover:text-ground disabled:opacity-50"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ↗
          </span>
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 pl-6 font-mono text-[10px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
