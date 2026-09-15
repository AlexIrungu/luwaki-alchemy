"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { modelUrl } from "@/lib/models";
import { DRACO_PATH, applyFinish, eachMaterial, prepareNail } from "@/lib/three/nail";
import { StudioEnvironment } from "@/components/three/StudioEnvironment";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Scroll progress through the UNIVERSE steps, written by the section's ScrollTrigger. */
export type ProgressRef = { current: number };

/**
 * Steps 1–2 of UNIVERSE (DESIGN.md §6). Reads scroll progress from a ref every
 * frame — never through React state, which would re-render 60 times a second.
 *
 *   DESIGN (0–0.25): the nail as a wireframe in the brand turquoise
 *   PRINT (0.25–0.45): a clipping plane rises from the tip, so the solid resin
 *   nail builds up through the wireframe like a print; the wireframe then fades
 */
function PrintedNail({ slug, progress, wireColor }: { slug: string; progress: ProgressRef; wireColor: string }) {
  const { scene } = useGLTF(modelUrl(slug, "web"), DRACO_PATH);
  const { gl } = useThree();
  const spin = useRef<THREE.Group>(null);

  const { solid, wire, wireMaterials, half } = useMemo(() => {
    const solid = prepareNail(scene);
    solid.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(solid);
    solid.position.sub(box.getCenter(new THREE.Vector3()));

    const wireMaterials: THREE.MeshBasicMaterial[] = [];
    const wire = solid.clone(true);
    wire.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.visible) return;
      const material = new THREE.MeshBasicMaterial({
        color: wireColor,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      wireMaterials.push(material);
      child.material = material;
    });

    // The nail stands on its Z axis (rotated −90° about X below), so its
    // height on screen is the local Z extent.
    return { solid, wire, wireMaterials, half: box.getSize(new THREE.Vector3()).z / 2 };
  }, [scene, wireColor]);

  // Keep only what sits below the plane: y ≤ constant.
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);

  useEffect(() => {
    gl.localClippingEnabled = true;
    eachMaterial(solid, (material) => {
      applyFinish(material, null);
      material.clippingPlanes = [plane];
    });
  }, [gl, solid, plane]);

  useFrame((_, delta) => {
    const p = progress.current;
    if (spin.current) spin.current.rotation.y += delta * 0.4;

    const printed = clamp01((p - 0.25) / 0.2);
    plane.constant = -half + printed * half * 2 + (printed >= 1 ? 0.01 : 0);

    const wireOpacity = 0.4 * (1 - clamp01((p - 0.44) / 0.05));
    wireMaterials.forEach((material) => {
      material.opacity = wireOpacity;
    });
  });

  return (
    <group ref={spin}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={solid} />
        <primitive object={wire} />
      </group>
    </group>
  );
}

export default function UniverseNail({ slug, progress }: { slug: string; progress: ProgressRef }) {
  // The wireframe colour follows the brand token rather than a hardcoded hex.
  const [wireColor, setWireColor] = useState<string | null>(null);
  useEffect(() => {
    setWireColor(getComputedStyle(document.documentElement).getPropertyValue("--color-turquoise").trim());
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
      camera={{ fov: 30, near: 0.001, far: 10, position: [0, 0, 0.1] }}
      className="h-full w-full"
    >
      <StudioEnvironment />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.6} />
      <directionalLight position={[-2, 1, -2.5]} intensity={1} />
      <Suspense fallback={null}>
        {wireColor && <PrintedNail slug={slug} progress={progress} wireColor={wireColor} />}
      </Suspense>
    </Canvas>
  );
}
