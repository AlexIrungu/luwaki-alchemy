const STEPS = [
  { status: "paid", label: "PAID" },
  { status: "in_production", label: "PRINTING" },
  { status: "shipped", label: "DISPATCHED" },
  { status: "delivered", label: "DELIVERED" },
] as const;

/** Where an order is between payment and the customer's hands. */
export function OrderTimeline({ status }: { status: string }) {
  const reached = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((step, i) => {
        const done = reached >= i;
        return (
          <li key={step.status}>
            <span className={`block h-1 ${done ? "bg-resin" : "bg-line"}`} />
            <span className={`mt-2 block font-mono text-[9px] tracking-[0.2em] ${i === reached ? "text-ink" : done ? "text-ink-dim" : "text-ink-faint"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
