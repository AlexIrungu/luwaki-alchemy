"use client";

import { useState, useTransition } from "react";
import { setOrderStatus } from "@/app/admin/actions";
import { statusLabel } from "@/components/admin/StatusChip";

const STATUSES = [
  "pending_payment", "paid", "in_production", "shipped", "delivered", "cancelled", "refunded",
];
/** These take money or work back, so they ask for a confirmation and a reason. */
const NEEDS_REASON = ["cancelled", "refunded"];

export function OrderStatus({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [value, setValue] = useState(status);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const commit = (next: string, why?: string) =>
    start(async () => {
      const result = await setOrderStatus(orderId, next, why);
      if (result?.error) {
        setError(result.error);
        setValue(status);
      } else {
        setError(undefined);
        setValue(next);
        setConfirming(null);
        setReason("");
      }
    });

  return (
    <div className="w-full text-right sm:w-auto print:hidden">
      <select
        value={confirming ?? value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (NEEDS_REASON.includes(next)) setConfirming(next);
          else commit(next);
        }}
        className="w-full border border-line bg-panel px-4 py-3 font-mono text-[11px] tracking-[0.15em] outline-none focus:border-ink-faint disabled:opacity-40 sm:w-auto"
      >
        {STATUSES.map((s) => (
          // "shipped" is set by the dispatch form, which records the courier.
          <option key={s} value={s} disabled={s === "shipped" && status !== "shipped"}>
            {statusLabel(s)}
          </option>
        ))}
      </select>

      {confirming && (
        <div role="dialog" aria-label={`Confirm ${statusLabel(confirming)}`} className="mt-3 border border-danger p-4 text-left sm:w-80">
          <p className="text-sm">
            Mark this order <strong>{statusLabel(confirming).toLowerCase()}</strong>?
            {confirming === "refunded" && " Refund the customer in Paystack first — this only records it."}
          </p>
          <label className="mt-3 block">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">REASON (KEPT ON THE TIMELINE)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-ink-faint"
            />
          </label>
          <div className="mt-3 flex justify-end gap-3 font-mono text-[10px] tracking-[0.2em]">
            <button type="button" onClick={() => { setConfirming(null); setReason(""); }} className="px-3 py-2 text-ink-dim hover:text-ink">
              KEEP {statusLabel(value)}
            </button>
            <button
              type="button"
              disabled={pending || reason.trim().length < 3}
              onClick={() => commit(confirming, reason)}
              className="border border-danger px-3 py-2 text-danger hover:bg-danger hover:text-invert disabled:opacity-40"
            >
              {pending ? "…" : `CONFIRM ${statusLabel(confirming)}`}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 font-mono text-[10px] text-danger">{error}</p>}
    </div>
  );
}
