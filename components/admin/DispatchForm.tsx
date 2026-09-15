"use client";

import { useActionState } from "react";
import { dispatchOrder, type AdminState } from "@/app/admin/actions";

const field =
  "w-full border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint";

/** Marks a paid / in-production order as shipped, with who is carrying it. */
export function DispatchForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(dispatchOrder, {});

  return (
    <form action={action} className="grid gap-4 border border-line p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="order_id" value={orderId} />
      <label className="space-y-2">
        <span className="block font-mono text-[10px] tracking-[0.25em] text-ink-faint">COURIER</span>
        <input name="courier" required placeholder="G4S, Wells Fargo, rider…" className={field} />
      </label>
      <label className="space-y-2">
        <span className="block font-mono text-[10px] tracking-[0.25em] text-ink-faint">TRACKING / WAYBILL (OPTIONAL)</span>
        <input name="tracking_ref" className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-ink px-6 py-3 font-mono text-[11px] tracking-[0.2em] hover:bg-ink hover:text-ground disabled:opacity-40"
      >
        {pending ? "…" : "MARK DISPATCHED"}
      </button>
      {state.error && <p role="alert" className="font-mono text-[11px] text-danger sm:col-span-3">{state.error}</p>}
    </form>
  );
}
