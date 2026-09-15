"use client";

import { useState, useTransition } from "react";
import { setOrderStatus } from "@/app/admin/actions";

const STATUSES = [
  "pending_payment", "paid", "in_production", "shipped", "delivered", "cancelled", "refunded",
];

export function OrderStatus({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="text-right">
      <select
        defaultValue={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const result = await setOrderStatus(orderId, e.target.value);
            setError(result?.error);
          })
        }
        className="border border-line bg-panel px-4 py-3 font-mono text-[11px] tracking-[0.15em] outline-none focus:border-ink-faint disabled:opacity-40"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>
        ))}
      </select>
      {error && <p role="alert" className="mt-2 font-mono text-[10px] text-danger">{error}</p>}
    </div>
  );
}
