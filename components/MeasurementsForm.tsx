"use client";

import { useActionState } from "react";
import { FINGERS, HANDS, type Finger, type Hand } from "@/lib/catalogue";
import { saveMeasurements, type FormState } from "@/app/account/actions";

const key = (hand: Hand, finger: Finger) => `${hand}-${finger}`;

export function MeasurementsForm({ existing }: { existing: Record<string, number> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveMeasurements, {});
  const filled = Object.keys(existing).length;

  return (
    <form action={formAction} className="mt-12">
      <div className="grid gap-10 sm:grid-cols-2">
        {HANDS.map((hand) => (
          <fieldset key={hand}>
            <legend className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">
              {hand.toUpperCase()} HAND
            </legend>
            <div className="mt-4 space-y-3">
              {FINGERS.map((finger) => (
                <div key={finger} className="flex items-center gap-4">
                  <label
                    htmlFor={key(hand, finger)}
                    className="w-20 text-sm capitalize text-ink-dim"
                  >
                    {finger}
                  </label>
                  <input
                    id={key(hand, finger)}
                    name={key(hand, finger)}
                    type="number"
                    step="0.5"
                    min={5}
                    max={25}
                    required
                    inputMode="decimal"
                    defaultValue={existing[key(hand, finger)] ?? ""}
                    className="w-24 border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-ink-faint"
                  />
                  <span className="font-mono text-[10px] text-ink-faint">MM</span>
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <p aria-live="polite" className="mt-10 font-mono text-[11px] text-ink-dim">
        {state.error ? (
          <span role="alert" className="text-danger">{state.error}</span>
        ) : state.ok ? (
          "Saved — all ten on file."
        ) : (
          `${filled} of 10 on file.`
        )}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 border border-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] transition-colors hover:bg-ink hover:text-ground disabled:opacity-50"
      >
        {pending ? "…" : "SAVE MEASUREMENTS"}
      </button>
    </form>
  );
}
