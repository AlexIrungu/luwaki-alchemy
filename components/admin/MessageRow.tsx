"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setMessageHandled } from "@/app/admin/actions";
import { StatusChip } from "@/components/admin/StatusChip";
import { TOPIC_LABEL, whatsappDigits } from "@/lib/contact";

export type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  topic: string;
  phone: string | null;
  handled: boolean;
  created_at: string;
  orders: { id: string; reference: string; status: string } | null;
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(iso));

export function MessageRow({ message }: { message: Message }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const subject = encodeURIComponent(
    `Re: your message to LUWAKI${message.orders ? ` (${message.orders.reference})` : ""}`,
  );
  const wa = whatsappDigits(message.phone);
  const action = "border border-line px-4 py-2 font-mono text-[10px] tracking-[0.2em] hover:border-ink-faint";

  return (
    <li className={`border border-line p-5 ${message.handled ? "opacity-60" : "bg-panel"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-line px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] text-ink-dim">
            {(TOPIC_LABEL[message.topic] ?? message.topic).toUpperCase()}
          </span>
          <span className="text-sm">{message.name}</span>
          <span className="text-xs text-ink-faint">{message.email}</span>
        </div>
        <span className="text-xs text-ink-faint">{when(message.created_at)}</span>
      </div>

      {message.orders && (
        <Link
          href={`/admin/orders/${message.orders.id}`}
          className="mt-3 inline-flex items-center gap-2 text-sm text-ink-dim hover:text-ink"
        >
          Order {message.orders.reference} <StatusChip status={message.orders.status} /> →
        </Link>
      )}

      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">{message.message}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <a href={`mailto:${message.email}?subject=${subject}`} className={action}>
          REPLY BY EMAIL
        </a>
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={action}>
            REPLY ON WHATSAPP
          </a>
        )}
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await setMessageHandled(message.id, !message.handled);
              setError(result.error);
            })
          }
          className={`${action} disabled:opacity-40`}
        >
          {pending ? "…" : message.handled ? "REOPEN" : "MARK HANDLED"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 font-mono text-[10px] text-danger">{error}</p>}
    </li>
  );
}
