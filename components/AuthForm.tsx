"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/sign-in/actions";

const field =
  "w-full border border-line bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint";
const label = "font-mono text-[10px] tracking-[0.25em] text-ink-faint";

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <>
      <div className="mt-10 flex gap-2">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`border px-4 py-2 font-mono text-[11px] tracking-[0.15em] transition-colors ${
              mode === m ? "border-ink text-ink" : "border-line text-ink-dim hover:border-ink-faint"
            }`}
          >
            {m === "in" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        ))}
      </div>

      {/* Remount on mode change so the previous mode's error doesn't linger. */}
      <form key={mode} action={formAction} className="mt-8 space-y-5">
        <input type="hidden" name="next" value={next} />

        {mode === "up" && (
          <>
            <div className="space-y-2">
              <label className={label} htmlFor="fullName">NAME</label>
              <input id="fullName" name="fullName" required className={field} />
            </div>
            <div className="space-y-2">
              <label className={label} htmlFor="phone">PHONE</label>
              <input id="phone" name="phone" type="tel" required className={field} />
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className={label} htmlFor="email">EMAIL</label>
          <input id="email" name="email" type="email" required className={field} />
        </div>
        <div className="space-y-2">
          <label className={label} htmlFor="password">PASSWORD</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            className={field}
          />
        </div>

        <p aria-live="polite" className="font-mono text-[11px]">
          {state.error ? (
            <span role="alert" className="text-danger">{state.error}</span>
          ) : state.notice ? (
            <span className="text-ink-dim">{state.notice}</span>
          ) : null}
        </p>

        <button
          type="submit"
          disabled={pending}
          className="w-full border border-ink py-4 font-mono text-[11px] tracking-[0.25em] transition-colors hover:bg-ink hover:text-ground disabled:opacity-50"
        >
          {pending ? "…" : mode === "in" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>
      </form>
    </>
  );
}
