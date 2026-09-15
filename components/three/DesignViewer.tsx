"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ColorPicker } from "@/components/three/ColorPicker";
import { SANZO } from "@/lib/sanzo";

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

export function DesignViewer({ slug, designName }: { slug: string; designName: string }) {
  const [colorIndex, setColorIndex] = useState<number | null>(null);
  const color = colorIndex === null ? null : SANZO[colorIndex];

  return (
    <>
      <div className="relative aspect-square border border-line bg-panel">
        <NailViewer slug={slug} color={color?.hex ?? null} />
      </div>
      <p className="mt-3 font-mono text-[10px] tracking-[0.25em] text-ink-faint">
        {designName.toUpperCase()} — {color ? color.name.toUpperCase() : "AS DESIGNED"} · DRAG TO TURN
      </p>
      <ColorPicker selected={colorIndex} onSelect={setColorIndex} onReset={() => setColorIndex(null)} />
    </>
  );
}
