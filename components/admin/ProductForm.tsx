"use client";

import { useActionState } from "react";
import { createProduct, updateProduct, type AdminState } from "@/app/admin/actions";
import { slugify } from "@/lib/slug";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unit_price_kes: number;
  collection_id: string | null;
};

const field =
  "w-full border border-line bg-panel px-4 py-3 text-sm text-ink outline-none focus:border-ink-faint";
const label = "font-mono text-[10px] tracking-[0.25em] text-ink-faint";

export function ProductForm({
  collections,
  product,
}: {
  collections: { id: string; name: string }[];
  product?: Product;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    product ? updateProduct : createProduct,
    {},
  );

  return (
    <form action={formAction} className="mt-10 space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-2">
        <label className={label} htmlFor="name">NAME</label>
        <input id="name" name="name" defaultValue={product?.name} required className={field} />
        <p className="font-mono text-[10px] text-ink-faint">
          /designs/{product?.slug ?? slugify(product?.name ?? "your-design-name")}
        </p>
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="collection_id">COLLECTION</label>
        <select
          id="collection_id"
          name="collection_id"
          defaultValue={product?.collection_id ?? ""}
          required
          className={field}
        >
          <option value="" disabled>Choose…</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="unit_price_kes">PRICE PER NAIL — KES</label>
        <input
          id="unit_price_kes"
          name="unit_price_kes"
          type="number"
          min={0}
          step={1}
          defaultValue={product?.unit_price_kes}
          required
          className={field}
        />
        <p className="font-mono text-[10px] text-ink-faint">
          A full set of ten costs ten times this, unless a shape overrides it below.
        </p>
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="description">DESCRIPTION</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className={field}
        />
      </div>

      <p aria-live="polite" className="font-mono text-[11px]">
        {state.error ? (
          <span role="alert" className="text-danger">{state.error}</span>
        ) : state.ok ? (
          <span className="text-ink-dim">Saved.</span>
        ) : null}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="border border-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] hover:bg-ink hover:text-ground disabled:opacity-50"
      >
        {pending ? "…" : product ? "SAVE" : "CREATE DESIGN"}
      </button>
    </form>
  );
}
