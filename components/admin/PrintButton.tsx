"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-line px-4 py-3 font-mono text-[10px] tracking-[0.2em] text-ink-dim hover:border-ink-faint print:hidden"
    >
      PRINT SHEET
    </button>
  );
}
