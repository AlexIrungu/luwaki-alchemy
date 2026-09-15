/**
 * Skeleton scaffolding. Every unbuilt section of the brief is rendered as one
 * of these so the shell is never mistaken for the finished site — `phase`
 * says which phase of the quote owns the work.
 */
export function Placeholder({
  title,
  brief,
  phase,
}: {
  title: string;
  brief: string;
  phase: 1 | 2 | 3;
}) {
  const label = { 1: "PHASE 1 · STORE", 2: "PHASE 2 · EFFECTS", 3: "PHASE 3 · 3D" }[phase];

  return (
    <section className="border-y border-line-soft px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-[10px] tracking-[0.25em] text-flag">{label}</p>
        <h2 className="mt-4 font-display text-4xl tracking-wide">{title}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-dim">{brief}</p>
      </div>
    </section>
  );
}
