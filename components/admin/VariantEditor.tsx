"use client";

import { useActionState, useTransition } from "react";
import {
  generateVariants,
  setVariantPrice,
  setVariantPublished,
  type AdminState,
} from "@/app/admin/actions";
import { formatKES } from "@/lib/money";
import type { Shape } from "@/lib/catalogue";

type Variant = {
  id: string;
  options: { shape?: Shape };
  price_kes: number | null;
  is_published: boolean;
};

/**
 * One row per shape. A blank price means "inherit the design's price" — only
 * fill it in when a shape genuinely costs differently (a stiletto uses more
 * resin than a square).
 */
export function VariantEditor({
  productId,
  basePriceKES,
  variants,
}: {
  productId: string;
  basePriceKES: number;
  variants: Variant[];
}) {
  const [generating, startGenerate] = useTransition();

  const ordered = [...variants].sort((a, b) =>
    (a.options.shape ?? "").localeCompare(b.options.shape ?? ""),
  );

  return (
    <section>
      <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">SHAPES</h2>

      {ordered.length > 0 ? (
        <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
          {ordered.map((v) => (
            <VariantRow key={v.id} variant={v} basePriceKES={basePriceKES} />
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-ink-dim">
            No shapes yet — they are normally created with the design.
          </p>
          <button
            disabled={generating}
            onClick={() => startGenerate(() => generateVariants(productId).then(() => {}))}
            className="mt-3 border border-line px-6 py-2 font-mono text-[10px] tracking-[0.2em] hover:border-ink-faint disabled:opacity-40"
          >
            {generating ? "…" : "CREATE THE FIVE SHAPES"}
          </button>
        </div>
      )}
    </section>
  );
}

function VariantRow({ variant, basePriceKES }: { variant: Variant; basePriceKES: number }) {
  const [state, formAction, saving] = useActionState<AdminState, FormData>(setVariantPrice, {});
  const [toggling, startToggle] = useTransition();

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="w-24 font-mono text-[11px] tracking-[0.1em]">
        {variant.options.shape?.toUpperCase() ?? "—"}
      </span>

      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="variant_id" value={variant.id} />
        <input
          name="price_kes"
          type="number"
          min={0}
          step={1}
          defaultValue={variant.price_kes ?? ""}
          placeholder={String(basePriceKES)}
          aria-label={`${variant.options.shape} price override`}
          className="w-24 border border-line bg-panel px-2 py-1 text-sm outline-none focus:border-ink-faint"
        />
        <button disabled={saving} className="font-mono text-[10px] text-ink-faint hover:text-ink">
          {saving ? "…" : "SET"}
        </button>
      </form>

      <span className="flex-1 text-right font-mono text-[10px] text-ink-faint">
        {state.error ? (
          <span role="alert" className="text-danger">{state.error}</span>
        ) : variant.price_kes === null ? (
          `inherits ${formatKES(basePriceKES)}`
        ) : (
          "override"
        )}
      </span>

      <button
        disabled={toggling}
        onClick={() => startToggle(() => setVariantPublished(variant.id, !variant.is_published).then(() => {}))}
        className={`w-24 border px-2 py-1 font-mono text-[10px] tracking-[0.1em] disabled:opacity-40 ${
          variant.is_published ? "border-line text-ink-dim" : "border-line-soft text-ink-faint"
        }`}
      >
        {variant.is_published ? "ON SALE" : "HIDDEN"}
      </button>
    </li>
  );
}
