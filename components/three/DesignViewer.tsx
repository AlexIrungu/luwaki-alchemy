"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ColorPicker } from "@/components/three/ColorPicker";
import { useDesignShape } from "@/components/DesignShape";
import { SANZO } from "@/lib/sanzo";
import type { View } from "@/components/three/NailViewer";

/**
 * three.js touches `window` at import time, so the viewer is client-only and
 * split into its own chunk — pages without a model never download it.
 */
const NailViewer = dynamic(() => import("./NailViewer"), {
  ssr: false,
  loading: () => (
    <span className="grid h-full place-items-center font-mono text-[10px] tracking-[0.25em] text-ink-faint">
      LOADING VIEWER
    </span>
  ),
});

const VIEWS: View[] = ["front", "side", "back"];

function ViewChips({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div className="flex gap-2">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === view}
          onClick={() => onChange(v)}
          className={`border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] transition-colors ${
            v === view ? "border-ink text-ink" : "border-line text-ink-dim hover:border-ink-faint"
          }`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function DesignViewer({
  slug,
  designName,
  bare = false,
}: {
  slug: string;
  designName: string;
  /** Drop the panel frame so the nail floats free over the page (DESCRIPTION page). */
  bare?: boolean;
}) {
  const [colorIndex, setColorIndex] = useState<number | null>(null);
  const [view, setView] = useState<View>("front");
  const [expanded, setExpanded] = useState(false);
  const color = colorIndex === null ? null : SANZO[colorIndex];
  const { shape, setShape, shapes, delivered } = useDesignShape();
  const ready = shape !== null && delivered.includes(shape);
  const caption = `${designName.toUpperCase()}${shape ? ` — ${shape.toUpperCase()}` : ""} — ${
    color ? color.name.toUpperCase() : "AS DESIGNED"
  }`;

  return (
    <>
      <div id="design-viewer" className={`relative aspect-square ${bare ? "" : "border border-line bg-panel"}`}>
        {ready && !expanded ? (
          <NailViewer slug={slug} shape={shape} color={color?.hex ?? null} view={view} />
        ) : (
          <span className="grid h-full place-items-center font-mono text-[10px] tracking-[0.25em] text-ink-faint">
            {expanded ? "VIEWING FULL SCREEN" : `${shape?.toUpperCase()} ARRIVING`}
          </span>
        )}
        {ready && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand the 3D viewer"
            className="absolute right-2 top-2 grid h-9 w-9 place-items-center border border-line bg-ground/70 text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
          >
            <ExpandIcon />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">
          {caption}
          {ready && " · DRAG TO TURN"}
        </p>
        {ready && <ViewChips view={view} onChange={setView} />}
      </div>

      <ColorPicker selected={colorIndex} onSelect={setColorIndex} onReset={() => setColorIndex(null)} />

      {expanded && shape && (
        <ExpandedViewer onClose={() => setExpanded(false)}>
          <div className="relative min-h-0 flex-1">
            {ready ? (
              <NailViewer slug={slug} shape={shape} color={color?.hex ?? null} view={view} zoom />
            ) : (
              <span className="grid h-full place-items-center font-mono text-[10px] tracking-[0.25em] text-ink-faint">
                {shape.toUpperCase()} ARRIVING
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-6 pt-4 sm:px-8">
            <div className="space-y-3">
              <p className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">
                {caption}
                {ready && " · DRAG TO TURN · PINCH OR SCROLL TO ZOOM"}
              </p>
              <div className="flex flex-wrap gap-2">
                {shapes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={s === shape}
                    onClick={() => setShape(s)}
                    className={`border px-4 py-2 font-mono text-[11px] tracking-[0.15em] transition-colors ${
                      s === shape ? "border-ink text-ink" : "border-line text-ink-dim hover:border-ink-faint"
                    }`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {ready && <ViewChips view={view} onChange={setView} />}
          </div>
        </ExpandedViewer>
      )}
    </>
  );
}

/**
 * Full-screen viewer. Only one canvas is ever live — the inline one unmounts
 * while this is open — because two WebGL contexts are what the iGPU drops.
 */
function ExpandedViewer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  // Held in a ref so a re-render (a new shape picked in here) doesn't re-run the
  // open/close effect and throw focus around.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  return createPortal(
    // data-lenis-prevent: wheel inside the overlay zooms the nail, never scrolls the page behind.
    <div role="dialog" aria-modal="true" aria-label="3D viewer" data-lenis-prevent className="fixed inset-0 z-[60] flex flex-col bg-ground">
      <button
        ref={close}
        type="button"
        onClick={onClose}
        aria-label="Close the 3D viewer"
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-line text-ink-dim transition-colors hover:border-ink-faint hover:text-ink sm:right-8 sm:top-6"
      >
        <span aria-hidden="true" className="text-lg leading-none">✕</span>
      </button>
      {children}
    </div>,
    document.body,
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" />
    </svg>
  );
}
