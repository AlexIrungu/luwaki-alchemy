"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Float, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { modelUrl, type Quality } from "@/lib/models";
import { DRACO_PATH, applyFinish, eachMaterial, prepareNail } from "@/lib/three/nail";
import { StudioEnvironment } from "@/components/three/StudioEnvironment";

function Nail({ slug, quality, color }: { slug: string; quality: Quality; color: string | null }) {
  const { scene } = useGLTF(modelUrl(slug, quality), DRACO_PATH);
  const model = useMemo(() => prepareNail(scene), [scene]);

  useEffect(() => {
    eachMaterial(model, (material) => applyFinish(material, color));
  }, [model, color]);

  // Rhino exports Z-up; stand the nail along the screen's vertical axis.
  return <primitive object={model} rotation={[-Math.PI / 2, 0, 0]} />;
}

/**
 * The nail is the page's character (rudlundschwarm's animated figures): it
 * turns in once, then keeps breathing — a slow float and sway on top of the
 * orbit turn. Motion is on the group transform only, never the geometry.
 */
function Alive({ animate, children }: { animate: boolean; children: ReactNode }) {
  const entrance = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);

  useFrame((state) => {
    const group = entrance.current;
    if (!group) return;
    if (!animate) {
      group.rotation.y = 0;
      return;
    }
    born.current ??= state.clock.elapsedTime;
    const k = Math.min(1, (state.clock.elapsedTime - born.current) / 1.6);
    const ease = 1 - Math.pow(1 - k, 4);
    // Turn only: Bounds fits against world scale, so scaling in would mis-frame the nail.
    group.rotation.y = (1 - ease) * -Math.PI * 1.5;
  });

  return (
    <group ref={entrance}>
      <Float enabled={animate} speed={1.6} rotationIntensity={0.35} floatIntensity={0.6} floatingRange={[-0.0012, 0.0012]}>
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

export default function NailViewer({ slug, color }: { slug: string; color: string | null }) {
  const [quality, setQuality] = useState<Quality>("web");
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    // Phones get the simplified mesh; everything else gets every triangle.
    setQuality(window.matchMedia("(min-width: 768px)").matches ? "full" : "web");
    // Reduced motion is checked in JS: the CSS rule can't stop a render loop.
    setAutoRotate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
      camera={{ fov: 32, near: 0.001, far: 100, position: [0.02, 0.01, 0.08] }}
      className="h-full w-full touch-none"
    >
      <StudioEnvironment />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.6} />
      <directionalLight position={[-2, 1, -2.5]} intensity={1} />

      <Suspense fallback={<Loading />}>
        <Bounds fit clip observe margin={1.05} key={`${slug}-${quality}`}>
          <Alive animate={autoRotate}>
            <Nail slug={slug} quality={quality} color={color} />
          </Alive>
        </Bounds>
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
      />
    </Canvas>
  );
}
