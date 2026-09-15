// Literal class names so Tailwind generates them. One colour per status,
// used everywhere an order status appears in the admin.
const CHIP: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "AWAITING PAYMENT", className: "border-line bg-panel-2 text-ink-dim" },
  paid: { label: "PAID", className: "border-gold bg-gold/25 text-ink" },
  in_production: { label: "IN PRODUCTION", className: "border-turquoise bg-turquoise/25 text-ink" },
  shipped: { label: "DISPATCHED", className: "border-burgundy bg-burgundy text-invert" },
  delivered: { label: "DELIVERED", className: "border-ink bg-ink text-ground" },
  cancelled: { label: "CANCELLED", className: "border-line text-ink-faint line-through" },
  refunded: { label: "REFUNDED", className: "border-line text-ink-faint line-through" },
};

export const statusLabel = (status: string) => CHIP[status]?.label ?? status.replace(/_/g, " ").toUpperCase();

export function StatusChip({ status }: { status: string }) {
  const chip = CHIP[status];
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] ${
        chip?.className ?? "border-line text-ink-dim"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}
