"use client";

import Image from "next/image";
import { useActionState, useTransition } from "react";
import { deleteMedia, uploadMedia, type AdminState } from "@/app/admin/actions";

type Media = { id: string; url: string; alt: string | null };

/**
 * Five stills per design at launch — one per shape — and thirty new designs a
 * month, so this takes multiple files at once.
 */
export function MediaUploader({ productId, media }: { productId: string; media: Media[] }) {
  const [state, formAction, uploading] = useActionState<AdminState, FormData>(uploadMedia, {});
  const [removing, startRemove] = useTransition();

  return (
    <section>
      <h2 className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">IMAGES</h2>

      {media.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {media.map((m) => (
            <li key={m.id} className="group relative aspect-[3/4] bg-panel">
              <Image
                src={m.url}
                alt={m.alt ?? ""}
                fill
                sizes="200px"
                className="object-cover"
              />
              <button
                disabled={removing}
                onClick={() => startRemove(() => deleteMedia(m.id).then(() => {}))}
                className="absolute right-1 top-1 bg-ground/80 px-2 py-1 font-mono text-[9px] text-ink-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger disabled:opacity-40"
              >
                REMOVE
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="product_id" value={productId} />
        <input
          type="file"
          name="files"
          accept="image/*"
          multiple
          required
          className="block w-full text-sm text-ink-dim file:mr-4 file:border file:border-line file:bg-panel file:px-4 file:py-2 file:font-mono file:text-[10px] file:tracking-[0.2em] file:text-ink"
        />
        <button
          disabled={uploading}
          className="border border-line px-6 py-2 font-mono text-[10px] tracking-[0.2em] hover:border-ink-faint disabled:opacity-40"
        >
          {uploading ? "UPLOADING…" : "UPLOAD"}
        </button>
        <p aria-live="polite" className="font-mono text-[10px]">
          {state.error ? (
            <span role="alert" className="text-danger">{state.error}</span>
          ) : state.ok ? (
            <span className="text-ink-dim">Uploaded.</span>
          ) : null}
        </p>
      </form>
    </section>
  );
}
