import { SLOTS, slotKey, type Finger } from "@/lib/catalogue";

/** Relative finger heights, so the row reads as two hands at a glance. */
const HEIGHT: Record<Finger, string> = { thumb: "h-5", index: "h-8", middle: "h-9", ring: "h-8", pinky: "h-6" };

/** Ten fingers, filled where a width is on file. */
export function HandsDiagram({ measured }: { measured: Set<string> }) {
  return (
    <div className="flex items-end gap-5" aria-label={`${measured.size} of 10 fingers measured`}>
      {(["left", "right"] as const).map((hand) => (
        <div key={hand} className="flex items-end gap-1">
          {SLOTS.filter((s) => s.hand === hand).map((slot) => (
            <span
              key={slotKey(slot)}
              title={`${slot.hand} ${slot.finger}`}
              className={`block w-2.5 rounded-t-full border ${HEIGHT[slot.finger]} ${
                measured.has(slotKey(slot)) ? "border-resin bg-resin" : "border-flag"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
