"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Center, Float, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { modelUrl, type Quality } from "@/lib/models";
import type { Shape } from "@/lib/catalogue";
import { DRACO_PATH, applyFinish, eachMaterial, prepareNail } from "@/lib/three/nail";
import { StudioEnvironment } from "@/components/three/StudioEnvironment";

export type View = "front" | "side" | "back";

const VIEW_ANGLE: Record<View, number> = { front: 0, side: Math.PI / 2, back: Math.PI };

/** Radians of sway either side of the chosen view — enough to show depth, never the back. */
const SWAY = 0.44;
/** Seconds after the last drag before the nail eases back to the chosen view. */
const SETTLE_AFTER = 3;
/** Radians per pixel of horizontal drag. */
const DRAG_SPEED = 0.012;

type Turn = { angle: number; dragging: boolean; releasedAt: number };

function Nail({ slug, shape, quality, color }: { slug: string; shape: Shape; quality: Quality; color: string | null }) {
  const { scene } = useGLTF(modelUrl(slug, shape, quality), DRACO_PATH);
  const model = useMemo(() => prepareNail(scene), [scene]);

  useEffect(() => {
    eachMaterial(model, (material) => applyFinish(material, color));
  }, [model, color]);

  // Rhino exports Z-up; stand the nail along the screen's vertical axis, then
  // turn it so the patterned top (+Y in Kent's exports) faces the camera — the
  // turn-in and the first frame land on the design, not the underside.
  // Centred because the turntable rotates the nail about the origin, and every
  // export still sits at its spot on Kent's Rhino sheet, up to 0.8 m away.
  return (
    <Center>
      <primitive object={model} rotation={[-Math.PI / 2, Math.PI, 0, "YXZ"]} />
    </Center>
  );
}

/**
 * The nail is the page's character (rudlundschwarm's animated figures): it
 * turns in once, then sways gently around the chosen view instead of spinning,
 * so the design is always in front of the customer. A drag turns it freely;
 * once let go it settles back. Motion is on the group transform only — Bounds
 * fits against world scale, so nothing here scales.
 */
function Turntable({
  animate,
  view,
  turn,
  children,
}: {
  animate: boolean;
  view: View;
  turn: RefObject<Turn>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const swayWeight = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    const t = turn.current;
    if (!g || !t) return;

    const now = performance.now() / 1000;
    const base = VIEW_ANGLE[view];
    const settling = !t.dragging && now - t.releasedAt > SETTLE_AFTER;

    if (settling) {
      // Nearest equivalent of the target, so a nail dragged round twice doesn't unwind.
      const target = base + Math.PI * 2 * Math.round((t.angle - base) / (Math.PI * 2));
      t.angle = animate ? THREE.MathUtils.damp(t.angle, target, 3, delta) : target;
    }

    swayWeight.current = THREE.MathUtils.damp(swayWeight.current, animate && settling ? 1 : 0, 2, delta);
    const sway = Math.sin(state.clock.elapsedTime * 0.45) * SWAY * swayWeight.current;

    let entrance = 0;
    if (animate) {
      born.current ??= state.clock.elapsedTime;
      const k = Math.min(1, (state.clock.elapsedTime - born.current) / 1.6);
      entrance = (1 - (1 - Math.pow(1 - k, 4))) * -Math.PI * 1.5;
    }

    g.rotation.y = t.angle + sway + entrance;
  });

  return (
    <group ref={group}>
      <Float enabled={animate} speed={1.6} rotationIntensity={0.2} floatIntensity={0.6} floatingRange={[-0.0012, 0.0012]}>
        {children}
      </Float>
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <span className="animate-pulse whitespace-nowrap font-mono text-[10px] tracking-[0.25em] text-ink-faint">
        LOADING GEOMETRY
      </span>
    </Html>
  );
}

export default function NailViewer({
  slug,
  shape,
  color,
  view = "front",
  zoom = false,
}: {
  slug: string;
  shape: Shape;
  color: string | null;
  view?: View;
  /** Pinch / wheel zoom — only in the expanded viewer, so the page scroll is never taken over. */
  zoom?: boolean;
}) {
  const [quality, setQuality] = useState<Quality>("web");
  const [animate, setAnimate] = useState(false);
  const turn = useRef<Turn>({ angle: 0, dragging: false, releasedAt: -Infinity });
  const pointers = useRef(new Map<number, number>());

  useEffect(() => {
    // Phones get the simplified mesh; everything else gets every triangle.
    setQuality(window.matchMedia("(min-width: 768px)").matches ? "full" : "web");
    // Reduced motion is checked in JS: the CSS rule can't stop a render loop.
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Choosing a view settles on it straight away, even mid-pause after a drag.
  useEffect(() => {
    turn.current.releasedAt = -Infinity;
  }, [view]);

  const release = (id: number) => {
    pointers.current.delete(id);
    if (pointers.current.size === 0 && turn.current.dragging) {
      turn.current.dragging = false;
      turn.current.releasedAt = performance.now() / 1000;
    }
  };

  return (
    <div
      className={`h-full w-full cursor-grab active:cursor-grabbing ${zoom ? "touch-none" : "touch-pan-y"}`}
      onPointerDown={(e) => {
        pointers.current.set(e.pointerId, e.clientX);
        // A second finger is a pinch, not a turn.
        turn.current.dragging = pointers.current.size === 1;
      }}
      onPointerMove={(e) => {
        const last = pointers.current.get(e.pointerId);
        if (last === undefined) return;
        pointers.current.set(e.pointerId, e.clientX);
        if (turn.current.dragging) turn.current.angle += (e.clientX - last) * DRAG_SPEED;
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onPointerLeave={(e) => release(e.pointerId)}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
        camera={{ fov: 32, near: 0.001, far: 100, position: [0.02, 0.01, 0.08] }}
        className="h-full w-full"
      >
        <StudioEnvironment />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.6} />
        <directionalLight position={[-2, 1, -2.5]} intensity={1} />

        <Suspense fallback={<Loading />}>
          {/* Keyed by shape too: a new shape refits the camera and replays the turn-in. */}
          <Bounds fit clip observe margin={1.05} key={`${slug}-${shape}-${quality}`}>
            <Turntable animate={animate} view={view} turn={turn}>
              <Nail slug={slug} shape={shape} quality={quality} color={color} />
            </Turntable>
          </Bounds>
        </Suspense>

        {/* Turning is the pointer handler above; the controls only ever zoom. */}
        <OrbitControls makeDefault enableRotate={false} enablePan={false} enableZoom={zoom} enableDamping dampingFactor={0.07} />
      </Canvas>
    </div>
  );
}
