"use client";

import { useActionState } from "react";
import { updateCommission, type AdminState } from "@/app/admin/actions";

const STAGES = ["brief", "sculpting", "finalization", "complete", "declined"];

type Commission = {
  id: string;
  stage: string;
  brief: string;
  reference_urls: string[] | null;
  quoted_kes: number | null;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
};

export function CommissionRow({ commission }: { commission: Commission }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(updateCommission, {});

  return (
    <li className="border border-line bg-panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-sm">
          {commission.profiles?.full_name ?? "—"}
          <span className="ml-3 font-mono text-[10px] text-ink-faint">
            {commission.profiles?.phone ?? "no phone"}
          </span>
        </span>
        <span className="font-mono text-[10px] text-ink-faint">
          {new Date(commission.created_at).toLocaleDateString("en-KE")}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">
        {commission.brief}
      </p>

      {commission.reference_urls?.length ? (
        <ul className="mt-3 space-y-1">
          {commission.reference_urls.map((url) => (
            <li key={url}>
              {/* Customer-supplied link — never followed automatically. */}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-mono text-[10px] text-resin underline"
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={formAction} className="mt-5 flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={commission.id} />
        <select
          name="stage"
          defaultValue={commission.stage}
          aria-label="Stage"
          className="border border-line bg-ground px-3 py-2 font-mono text-[10px] tracking-[0.15em] outline-none focus:border-ink-faint"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{s.toUpperCase()}</option>
          ))}
        </select>
        <input
          name="quoted_kes"
          type="number"
          min={0}
          step={1}
          defaultValue={commission.quoted_kes ?? ""}
          placeholder="Quote KES"
          aria-label="Quote in KES"
          className="w-32 border border-line bg-ground px-3 py-2 text-sm outline-none focus:border-ink-faint"
        />
        <button
          disabled={pending}
          className="border border-line px-5 py-2 font-mono text-[10px] tracking-[0.2em] hover:border-ink-faint disabled:opacity-40"
        >
          {pending ? "…" : "SAVE"}
        </button>
        <span aria-live="polite" className="font-mono text-[10px]">
          {state.error ? (
            <span role="alert" className="text-danger">{state.error}</span>
          ) : state.ok ? (
            <span className="text-ink-faint">Saved.</span>
          ) : null}
        </span>
      </form>
    </li>
  );
}
