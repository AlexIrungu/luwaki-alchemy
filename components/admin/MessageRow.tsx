"use client";

import { useTransition } from "react";
import { setMessageHandled } from "@/app/admin/actions";

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  handled: boolean;
  created_at: string;
};

export function MessageRow({ message }: { message: Message }) {
  const [pending, start] = useTransition();

  return (
    <li className={`border border-line p-5 ${message.handled ? "opacity-50" : "bg-panel"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-sm">
          {message.name}
          <a href={`mailto:${message.email}`} className="ml-3 font-mono text-[10px] text-resin underline">
            {message.email}
          </a>
        </span>
        <span className="font-mono text-[10px] text-ink-faint">
          {new Date(message.created_at).toLocaleDateString("en-KE")}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">
        {message.message}
      </p>

      <button
        disabled={pending}
        onClick={() => start(() => setMessageHandled(message.id, !message.handled).then(() => {}))}
        className="mt-4 border border-line px-5 py-2 font-mono text-[10px] tracking-[0.2em] hover:border-ink-faint disabled:opacity-40"
      >
        {pending ? "…" : message.handled ? "REOPEN" : "MARK HANDLED"}
      </button>
    </li>
  );
}
