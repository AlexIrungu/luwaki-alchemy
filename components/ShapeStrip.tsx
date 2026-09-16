"use client";

import Image from "next/image";
import { SHAPES, type Shape } from "@/lib/catalogue";
import { useDesignShape } from "@/components/DesignShape";

/**
 * The "Five shapes" row under a design. A delivered shape is lit and picks
 * that shape when tapped, bringing the viewer back into view to show it.
 */
export function ShapeStrip({
  designName,
  stills,
}: {
  designName: string;
  /** Rendered tile per delivered shape; a shape without one reads VIEW IN 3D. */
  stills: Partial<Record<Shape, string>>;
}) {
  const { shape: selected, setShape, delivered } = useDesignShape();

  return (
    <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
      {SHAPES.map((shape) => {
        const ready = delivered.includes(shape);
        const active = shape === selected;
        const image = stills[shape];
        return (
          <li key={shape}>
            <button
              type="button"
              disabled={!ready}
              aria-pressed={active}
              onClick={() => {
                setShape(shape);
                document.getElementById("design-viewer")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="group block w-full text-left disabled:cursor-default"
            >
              <div
                className={`relative aspect-[3/4] overflow-hidden border bg-panel transition-colors ${
                  active ? "border-ink" : ready ? "border-line group-hover:border-ink-faint" : "border-line"
                }`}
              >
                {ready && image ? (
                  <Image src={image} alt={`${designName}, ${shape}`} fill sizes="(min-width: 640px) 14rem, 45vw" className="object-contain p-3" />
                ) : (
                  <span
                    className={`grid h-full place-items-center font-mono text-[9px] tracking-[0.25em] ${
                      ready ? "text-ink-dim" : "text-ink-faint"
                    }`}
                  >
                    {ready ? "VIEW IN 3D" : "ARRIVING"}
                  </span>
                )}
              </div>
              <p className={`mt-3 font-mono text-[10px] tracking-[0.25em] ${ready ? "text-ink" : "text-ink-faint"}`}>
                {shape.toUpperCase()}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
