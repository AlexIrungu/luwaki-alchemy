"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Shape } from "@/lib/catalogue";

type DesignShape = {
  shape: Shape | null;
  setShape: (shape: Shape) => void;
  /** Shapes this design is sold in, in catalogue order. */
  shapes: Shape[];
  /** Shapes Kent has delivered geometry for. */
  delivered: Shape[];
};

const Context = createContext<DesignShape | null>(null);

/**
 * The shape picked on a design page. The viewer, the SHAPE buttons and the
 * shape strip all read it, so choosing a shape anywhere changes all three.
 */
export function DesignShapeProvider({
  shapes,
  delivered,
  initial,
  children,
}: {
  /** Shapes this design is sold in, in catalogue order. */
  shapes: Shape[];
  delivered: Shape[];
  /** A shape asked for in the link (`?shape=`) — used when this design is sold in it. */
  initial?: Shape;
  children: ReactNode;
}) {
  // Coffin was Kent's first delivery for every design, so it leads when present.
  const [shape, setShape] = useState<Shape | null>(
    (initial && shapes.includes(initial) ? initial : null) ??
      (shapes.includes("coffin") && delivered.includes("coffin") ? "coffin" : null) ??
      shapes.find((s) => delivered.includes(s)) ??
      shapes[0] ??
      null,
  );

  return <Context.Provider value={{ shape, setShape, shapes, delivered }}>{children}</Context.Provider>;
}

export function useDesignShape() {
  const value = useContext(Context);
  if (!value) throw new Error("useDesignShape needs a <DesignShapeProvider> above it");
  return value;
}
