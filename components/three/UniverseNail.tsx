"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { MORPH } from "@/lib/morph";
import { StudioEnvironment } from "@/components/three/StudioEnvironment";
import {
  type DesignMaps,
  type Tokens,
  buildGrid,
  createUniforms,
  loadMaps,
  makeHitPlane,
  makeMaterial,
  makeWireMaterial,
  noRaycast,
} from "@/lib/three/surfaceMorph";

/** Scroll progress through the UNIVERSE steps (0–1), written by the section's ScrollTrigger. */
export type ProgressRef = { current: number };
/** The rainbow cursor's current hue in degrees, written on pointer move. */
export type HueRef = { current: number };

const SEG = 0.25;
/** The nail's length in the grid's Z axis, with a little headroom. */
const NAIL_HALF = 0.0185;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The UNIVERSE nail, one surface-morph mesh read against scroll every frame
 * (never through React state):
 *
 *   DESIGN — the nail as a wireframe in the glow colour
 *   PRINT  — the solid nail builds up layer by layer through the wireframe,
 *            its pattern lifting off the resin shell and settling back as it
 *            completes (duten's product coming apart)
 *   COLOR  — the nail morphs through the designs as you scroll, recoloured by
 *            the rainbow cursor, rippling where you point
 *   REPEAT — the section fades the canvas out for the wall
 */
function Sequence({
  designs,
  tokens,
  progress,
  hue,
}: {
  designs: DesignMaps[];
  tokens: Tokens;
  progress: ProgressRef;
  hue: HueRef;
}) {
  const rig = useRef<THREE.Group>(null);

  const scene = useMemo(() => {
    const uniforms = createUniforms(designs[0], designs[0], tokens, 1);
    const top = new THREE.Mesh(buildGrid(1), makeMaterial(1, uniforms));
    const underside = new THREE.Mesh(buildGrid(-1), makeMaterial(-1, uniforms));
    const wireMaterial = makeWireMaterial(uniforms);
    const wire = new THREE.Mesh(buildGrid(1, 6), wireMaterial);
    [top, underside, wire].forEach((mesh) => {
      mesh.raycast = noRaycast;
    });
    const { bounds } = MORPH;
    const hit = makeHitPlane((bounds.x1 - bounds.x0) / 1000, (bounds.z1 - bounds.z0) / 1000);
    return { uniforms, top, underside, wire, wireMaterial, hit };
  }, [designs, tokens]);

  useEffect(
    () => () => {
      [scene.top, scene.underside, scene.wire, scene.hit].forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      document.body.style.cursor = "";
    },
    [scene],
  );

  const pointer = useMemo(
    () => ({
      x: gsap.quickTo(scene.uniforms.uPointer.value, "x", { duration: 0.45, ease: "power3" }),
      y: gsap.quickTo(scene.uniforms.uPointer.value, "y", { duration: 0.45, ease: "power3" }),
    }),
    [scene],
  );
  const inColor = () => progress.current >= 2 * SEG && progress.current < 3 * SEG;
  const onMove = (event: ThreeEvent<PointerEvent>) => {
    const local = scene.top.worldToLocal(event.point.clone());
    const { bounds } = MORPH;
    pointer.x((local.x * 1000 - bounds.x0) / (bounds.x1 - bounds.x0));
    pointer.y((local.z * 1000 - bounds.z0) / (bounds.z1 - bounds.z0));
  };
  const onOver = () => {
    if (!inColor()) return;
    gsap.to(scene.uniforms.uPointerStrength, { value: 1, duration: 0.6, ease: "power2.out", overwrite: true });
  };
  const onOut = () => {
    gsap.to(scene.uniforms.uPointerStrength, { value: 0, duration: 1.2, ease: "power2.out", overwrite: true });
  };

  useFrame((state) => {
    const p = progress.current;
    const t = state.clock.elapsedTime;
    const u = scene.uniforms;
    u.uTime.value = t;

    // DESIGN → PRINT
    const drawn = clamp01(p / (SEG * 0.4));
    const printed = clamp01((p - SEG - 0.02) / (SEG * 0.8));
    u.uPrintOn.value = p < 2 * SEG ? 1 : 0;
    // Before PRINT the level sits below the nail, so the solid doesn't exist yet.
    u.uPrintLevel.value = p < SEG ? -1 : THREE.MathUtils.lerp(-NAIL_HALF, NAIL_HALF, printed);
    // The pattern lifts away as printing starts and settles back by the end.
    u.uExplode.value = p >= SEG && p < 2 * SEG ? Math.sin(Math.min(1, printed * 1.15) * Math.PI) * 1.6 : 0;
    scene.wireMaterial.opacity = 0.55 * (p < SEG ? drawn : 1 - clamp01((printed - 0.75) / 0.25));
    scene.wire.visible = scene.wireMaterial.opacity > 0.01 && p < 2 * SEG;

    // COLOR: scroll morphs through the designs; the cursor's hue tints them.
    if (p >= 2 * SEG && designs.length > 1) {
      const along = clamp01((p - 2 * SEG) / SEG) * (designs.length - 1);
      const i = Math.min(designs.length - 2, Math.floor(along));
      u.uHA.value = designs[i].height;
      u.uCA.value = designs[i].color;
      u.uHB.value = designs[i + 1].height;
      u.uCB.value = designs[i + 1].color;
      u.uProgress.value = along - i;
    } else {
      u.uHA.value = designs[0].height;
      u.uCA.value = designs[0].color;
      u.uHB.value = designs[0].height;
      u.uCB.value = designs[0].color;
      u.uProgress.value = 0;
    }
    u.uTint.value.setHSL(hue.current / 360, 0.75, 0.5);
    u.uTintAmount.value = clamp01((p - 2 * SEG) / 0.03) * (1 - clamp01((p - 3 * SEG) / 0.04));
    if (!inColor() && u.uPointerStrength.value > 0) u.uPointerStrength.value *= 0.9;

    if (!rig.current) return;
    rig.current.rotation.y = Math.sin(t * 0.45) * 0.9;
    rig.current.position.y = Math.sin(t * 0.8) * 0.001;
  });

  return (
    <group rotation={[0.1, 0, -0.12]}>
      <group ref={rig}>
        {/* Grid lies in X–Z with the pattern on +Y: stand it up, pattern to camera. */}
        <group rotation={[0, 0, Math.PI]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <primitive object={scene.top} />
            <primitive object={scene.underside} />
            <primitive object={scene.wire} />
            <primitive object={scene.hit} onPointerMove={onMove} onPointerOver={onOver} onPointerOut={onOut} />
          </group>
        </group>
      </group>
    </group>
  );
}

export default function UniverseNail({
  slugs,
  progress,
  hue,
}: {
  slugs: string[];
  progress: ProgressRef;
  hue: HueRef;
}) {
  const [designs, setDesigns] = useState<DesignMaps[] | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Colours follow the brand tokens rather than hardcoded hex.
    const css = getComputedStyle(document.documentElement);
    setTokens({
      glow: css.getPropertyValue("--color-turquoise").trim(),
      resin: css.getPropertyValue("--color-shell").trim(),
      ground: css.getPropertyValue("--color-ground").trim(),
    });
    let cancelled = false;
    Promise.all(slugs.map(loadMaps))
      .then((loaded) => !cancelled && setDesigns(loaded))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  // Without the nail the step copy and line drawings still carry the section.
  if (failed || slugs.length === 0) return null;

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            setFailed(true);
          },
          { once: true },
        );
      }}
      camera={{ fov: 30, near: 0.001, far: 10, position: [0, 0, 0.1] }}
      className="h-full w-full"
    >
      <StudioEnvironment />
      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 3, 2.5]} intensity={1.7} />
      <directionalLight position={[-3, 1, -2]} intensity={1.1} />
      {designs && tokens && <Sequence designs={designs} tokens={tokens} progress={progress} hue={hue} />}
    </Canvas>
  );
}
