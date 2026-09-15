"use client";

import { useMemo } from "react";
import { COMBINATIONS, SANZO } from "@/lib/sanzo";

/**
 * A customer aid, not a product variant: see a design in any of Sanzo Wada's
 * 159 colours, then take the name to a nail tech. Never touches the cart or
 * the schema. Swatch backgrounds are inline because they are data, not tokens.
 */
export function ColorPicker({
  selected,
  onSelect,
  onReset,
}: {
  selected: number | null;
  onSelect: (index: number) => void;
  onReset: () => void;
}) {
  const current = selected === null ? null : SANZO[selected];
  const plates = useMemo(
    () => (selected === null ? [] : COMBINATIONS.filter((plate) => plate.includes(selected)).slice(0, 6)),
    [selected],
  );

  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.25em]">TRY A COLOUR</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-dim">
            Preview this design in the 159 colours of Sanzo Wada&rsquo;s <em>Dictionary of Color
            Combinations</em>, then take the name to your nail tech.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {current && (
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-6 border border-line"
                style={{ background: current.hex }}
              />
              <span className="font-mono text-[11px] leading-tight">
                <span className="block">{current.name}</span>
                <span className="block text-ink-faint">{current.hex}</span>
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            disabled={current === null}
            className="border border-line px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-ink-dim transition-colors hover:bg-panel-2 hover:text-ink disabled:opacity-40"
          >
            AS DESIGNED
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1" role="group" aria-label="Colours">
        {SANZO.map((color, i) => (
          <button
            key={`${color.name}-${i}`}
            type="button"
            title={`${color.name} · ${color.hex}`}
            aria-label={color.name}
            aria-pressed={selected === i}
            onClick={() => onSelect(i)}
            style={{ background: color.hex }}
            className={`size-6 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-resin ${
              selected === i ? "scale-110 ring-2 ring-resin ring-offset-2 ring-offset-ground" : "hover:scale-110"
            }`}
          />
        ))}
      </div>

      {plates.length > 0 && (
        <div className="mt-6">
          <h3 className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
            WADA PAIRED {current?.name.toUpperCase()} WITH
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {plates.map((plate, p) => (
              <div key={p} className="flex overflow-hidden border border-line" role="group">
                {plate.map((index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onSelect(index)}
                    title={`${SANZO[index].name} · ${SANZO[index].hex}`}
                    aria-label={SANZO[index].name}
                    style={{ background: SANZO[index].hex }}
                    className="h-8 w-10 transition-opacity hover:opacity-80"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
