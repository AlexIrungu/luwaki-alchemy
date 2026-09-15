"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { setPrices } from "@/app/admin/actions";
import { formatKES } from "@/lib/money";

export type PriceRow = {
  id: string;
  name: string;
  collection: string | null;
  isPublished: boolean;
  shapes: number;
  images: number;
  priceKES: number;
};

/**
 * The designs list with an editable price column. Edits stay local until
 * "Save", so a whole price sheet goes in as one change; "Set all shown" fills
 * the filtered rows with one price.
 */
export function PriceTable({ rows }: { rows: PriceRow[] }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");
  const [fill, setFill] = useState("");
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const collections = useMemo(
    () => [...new Set(rows.map((r) => r.collection).filter((c): c is string => Boolean(c)))],
    [rows],
  );
  const shown = rows.filter((r) => !filter || r.collection === filter);

  const changes = rows.flatMap((r) => {
    const raw = draft[r.id];
    if (raw === undefined || raw === "") return [];
    const value = Number(raw);
    return value !== r.priceKES ? [{ id: r.id, unit_price_kes: value }] : [];
  });
  const invalid = changes.some((c) => !Number.isInteger(c.unit_price_kes) || c.unit_price_kes < 0);

  const save = () =>
    startTransition(async () => {
      const result = await setPrices(changes);
      if (result.error) setMessage({ error: result.error });
      else {
        setMessage({ ok: `${changes.length} price${changes.length === 1 ? "" : "s"} saved.` });
        setDraft({});
      }
    });

  const field = "border border-line bg-panel px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-ink-faint";

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end gap-4 border border-line p-4">
        <label className="space-y-1">
          <span className="block font-mono text-[9px] tracking-[0.25em] text-ink-faint">COLLECTION</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={field}>
            <option value="">All</option>
            {collections.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[9px] tracking-[0.25em] text-ink-faint">PRICE PER NAIL (KES, EXCL. VAT)</span>
          <input inputMode="numeric" value={fill} onChange={(e) => setFill(e.target.value.replace(/\D/g, ""))} className={`${field} w-40`} />
        </label>
        <button
          type="button"
          disabled={!fill}
          onClick={() => setDraft((d) => ({ ...d, ...Object.fromEntries(shown.map((r) => [r.id, fill])) }))}
          className="border border-line px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-ink-dim hover:border-ink-faint disabled:opacity-40"
        >
          SET ALL SHOWN ({shown.length})
        </button>

        <div className="ml-auto flex items-center gap-4">
          {message && (
            <p role="status" className={`font-mono text-[11px] ${message.error ? "text-danger" : "text-resin"}`}>
              {message.error ?? message.ok}
            </p>
          )}
          {changes.length > 0 && (
            <button type="button" onClick={() => setDraft({})} className="font-mono text-[10px] tracking-[0.2em] text-ink-faint hover:text-ink">
              DISCARD
            </button>
          )}
          <button
            type="button"
            disabled={!changes.length || invalid || pending}
            onClick={save}
            className="border border-ink px-5 py-2 font-mono text-[10px] tracking-[0.2em] hover:bg-ink hover:text-ground disabled:opacity-40"
          >
            {pending ? "SAVING…" : `SAVE ${changes.length || ""} CHANGE${changes.length === 1 ? "" : "S"}`}
          </button>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-line-soft border-y border-line-soft">
        {shown.map((r) => {
          const raw = draft[r.id];
          const changed = raw !== undefined && raw !== "" && Number(raw) !== r.priceKES;
          return (
            <li key={r.id} className="flex items-center gap-4 py-3">
              <span
                title={r.isPublished ? "Published" : "Draft"}
                className={`size-2 shrink-0 rounded-full ${r.isPublished ? "bg-resin" : "bg-ink-faint"}`}
              />
              <Link href={`/admin/products/${r.id}`} className="flex-1 font-display text-xl hover:opacity-70">
                {r.name}
              </Link>
              <span className="hidden w-28 font-mono text-[10px] tracking-[0.2em] text-ink-faint sm:block">{r.collection ?? "—"}</span>
              <span className="hidden w-20 font-mono text-[10px] text-ink-faint md:block">{r.shapes} shapes</span>
              <span className="hidden w-20 font-mono text-[10px] text-ink-faint md:block">{r.images} images</span>
              <label className="flex items-center gap-2">
                <span className="sr-only">Price for {r.name}</span>
                <span className="font-mono text-[10px] text-ink-faint">KES</span>
                <input
                  inputMode="numeric"
                  value={raw ?? String(r.priceKES)}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value.replace(/\D/g, "") }))}
                  className={`${field} w-28 text-right ${changed ? "border-flag" : ""}`}
                />
              </label>
              <span className="hidden w-24 text-right font-mono text-[10px] text-ink-faint lg:block">
                {changed ? `was ${formatKES(r.priceKES)}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
