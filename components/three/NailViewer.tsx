"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Html, OrbitControls, useGLTF } from "@react-three/drei";
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
        <Bounds fit clip observe margin={1.2} key={`${slug}-${quality}`}>
          <Nail slug={slug} quality={quality} color={color} />
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
