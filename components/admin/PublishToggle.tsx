"use client";

import { useState, useTransition } from "react";
import { setPublished } from "@/app/admin/actions";

/**
 * Publishing is the only thing that makes a design public — RLS reads
 * `is_published`. The action refuses to publish a design with no buyable shape
 * or no imagery; this surfaces why before the click.
 */
export function PublishToggle({
  productId,
  isPublished,
  variantCount,
  mediaCount,
}: {
  productId: string;
  isPublished: boolean;
  variantCount: number;
  mediaCount: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const blocked = !isPublished && (variantCount === 0 || mediaCount === 0);

  return (
    <div className="text-right">
      <button
        disabled={pending || blocked}
        onClick={() =>
          start(async () => {
            const result = await setPublished(productId, !isPublished);
            setError(result?.error);
          })
        }
        className={`border px-6 py-3 font-mono text-[11px] tracking-[0.2em] disabled:opacity-40 ${
          isPublished ? "border-line text-ink-dim hover:border-ink-faint" : "border-ink hover:bg-ink hover:text-ground"
        }`}
      >
        {pending ? "…" : isPublished ? "UNPUBLISH" : "PUBLISH"}
      </button>
      <p className="mt-2 font-mono text-[10px] text-ink-faint">
        {error ? (
          <span role="alert" className="text-danger">{error}</span>
        ) : blocked ? (
          variantCount === 0 ? "Publish a shape first" : "Add an image first"
        ) : isPublished ? (
          "Live on the site"
        ) : (
          "Draft — not visible"
        )}
      </p>
    </div>
  );
}
