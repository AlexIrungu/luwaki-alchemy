"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/account/actions";

type Profile = {
  full_name: string | null;
  phone: string | null;
  preferred_collection: string | null;
  wants_new_releases: boolean;
};

const field =
  "w-full border border-line bg-panel px-4 py-3 text-sm text-ink outline-none focus:border-ink-faint";
const label = "font-mono text-[10px] tracking-[0.25em] text-ink-faint";

export function ProfileForm({
  profile,
  collections,
}: {
  profile: Profile;
  collections: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateProfile, {});

  return (
    <form action={formAction} className="mt-12 space-y-6">
      <div className="space-y-2">
        <label className={label} htmlFor="full_name">NAME</label>
        <input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} required className={field} />
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="phone">PHONE</label>
        <input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} required className={field} />
      </div>

      <div className="space-y-2">
        <label className={label} htmlFor="preferred_collection">PREFERRED COLLECTION</label>
        <select
          id="preferred_collection"
          name="preferred_collection"
          defaultValue={profile.preferred_collection ?? ""}
          className={field}
        >
          <option value="">No preference</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-3 text-sm text-ink-dim">
        <input
          type="checkbox"
          name="wants_new_releases"
          defaultChecked={profile.wants_new_releases}
          className="size-4 accent-resin"
        />
        Tell me about new releases
      </label>

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
        className="border border-ink px-10 py-4 font-mono text-[11px] tracking-[0.25em] transition-colors hover:bg-ink hover:text-ground disabled:opacity-50"
      >
        {pending ? "…" : "SAVE"}
      </button>
    </form>
  );
}
