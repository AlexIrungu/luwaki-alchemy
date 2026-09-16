"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setSaved } from "@/app/designs/actions";

/** ♡ on a design page. Signed out, it asks the customer to sign in and brings them back. */
export function SaveDesign({
  productId,
  slug,
  initialSaved,
  signedIn,
}: {
  productId: string;
  slug: string;
  initialSaved: boolean;
  signedIn: boolean;
}) {
  const [saved, setSavedState] = useState(initialSaved);
  const [pending, start] = useTransition();
  const style = "inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] transition-colors";

  if (!signedIn) {
    return (
      <Link href={`/sign-in?next=/designs/${slug}`} className={`${style} text-ink-dim hover:text-ink`}>
        <Heart filled={false} /> SAVE
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const next = !saved;
          setSavedState(next); // show it straight away
          const result = await setSaved(productId, next);
          if (result !== next) setSavedState(!next); // the write failed: put it back
        })
      }
      className={`${style} ${saved ? "text-resin" : "text-ink-dim hover:text-ink"}`}
    >
      <Heart filled={saved} /> {saved ? "SAVED" : "SAVE"}
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
      <path d="M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5Z" />
    </svg>
  );
}
