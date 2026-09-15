"use client";

import { useActionState } from "react";
import { createCommission, type CommissionState } from "@/app/private-edit/actions";

const field =
  "w-full border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint";
const label = "font-mono text-[10px] tracking-[0.25em] text-ink-faint";

export function CommissionForm() {
  const [state, formAction, pending] = useActionState<CommissionState, FormData>(
    createCommission,
    {},
  );

  return (
    <form action={formAction} className="mt-12 space-y-6">
      <div className="space-y-2">
        <label className={label} htmlFor="brief">THE IDEA</label>
        <textarea
          id="brief"
          name="brief"
          rows={8}
          required
          minLength={40}
          placeholder="Shape, finish, colour, the occasion — anything that helps us picture it."
          className={field}
        />
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="reference_urls">REFERENCES — ONE LINK PER LINE</label>
        <textarea
          id="reference_urls"
          name="reference_urls"
          rows={3}
          placeholder="https://…"
          className={field}
        />
      </div>

      {state.error && (
        <p role="alert" className="font-mono text-[11px] text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="border border-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] hover:bg-ink hover:text-ground disabled:opacity-50"
      >
        {pending ? "…" : "SEND THE BRIEF"}
      </button>
    </form>
  );
}
