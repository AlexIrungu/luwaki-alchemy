"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { modelUrl, type Quality } from "@/lib/models";

const DRACO_PATH = "/draco/";

/**
 * drei's <Environment preset> fetches an HDR from a CDN and suspends — outside a
 * <Suspense> that renders the whole Canvas blank white. RoomEnvironment is built
 * locally from three's own code: no network, no suspense.
 */
function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    return () => {
      scene.environment = null;
      envMap.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

/**
 * Every export carries a thin print tab (~3 × 1 × 27 mm, a few hundred
 * vertices) alongside the nail. It is production scaffolding, not the design.
 */
function isPrintTab(mesh: THREE.Mesh) {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  const [a, b, c] = [size.x, size.y, size.z].sort((m, n) => m - n);
  return a < 0.0015 && b < 0.004 && c > 0.02 && geometry.attributes.position.count < 400;
}

function Nail({ slug, quality, color }: { slug: string; quality: Quality; color: string | null }) {
  const { scene } = useGLTF(modelUrl(slug, quality), DRACO_PATH);

  // useGLTF caches by URL and Object3D.clone() shares materials with the
  // original — clone the materials too, or changes leak between designs.
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (isPrintTab(child)) {
        child.visible = false;
        return;
      }
      child.material = Array.isArray(child.material)
        ? child.material.map((m) => m.clone())
        : child.material.clone();

      // Classify once, from the colour as exported. Re-testing after a
      // colourway is applied would misread a pale pick (White) as the shell.
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshPhysicalMaterial)) return;
        material.userData.isShell = material.color.getHSL({ h: 0, s: 0, l: 0 }).s < 0.15;
        material.userData.exported = material.color.clone();
      });
    });
    return copy;
  }, [scene]);

  useEffect(() => {
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.visible) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshPhysicalMaterial)) return;

        // Kent's files pair a colourless shell with the coloured, modelled
        // pattern beneath it. The shell is the translucent resin; the export
        // declares transmission without a factor, so restore it here. Only the
        // pattern takes a colourway — the resin stays clear.
        if (material.userData.isShell) {
          material.transmission = 0.92;
          material.thickness = 0.004;
          material.ior = 1.5;
          material.roughness = 0.08;
        } else {
          material.roughness = 0.25;
          material.color.copy(color ? new THREE.Color(color) : material.userData.exported);
        }
        material.clearcoat = 1;
        material.clearcoatRoughness = 0.04;
        material.needsUpdate = true;
      });
    });
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
