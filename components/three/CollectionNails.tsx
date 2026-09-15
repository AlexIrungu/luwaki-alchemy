"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MORPH } from "@/lib/morph";
import { StudioEnvironment } from "@/components/three/StudioEnvironment";
import {
  type DesignMaps,
  type Tokens,
  buildGrid,
  createUniforms,
  loadMaps,
  makeMaterial,
  noRaycast,
} from "@/lib/three/surfaceMorph";

/** Every 4th texel — each nail is only a card's height on screen. */
const STEP = 4;
const GRID_WIDTH = (MORPH.bounds.x1 - MORPH.bounds.x0) / 1000;
const NAIL_LENGTH = 0.036;

type Point = { x: number; y: number };

/**
 * Live nails for the COLLECTIONS grid. The cards live in a CSS plane tilted in
 * 3D and keep moving (sliding rows, scroll lean, trailing, hover lift, cursor
 * tilt), so one canvas over the whole stage tracks them instead: every frame
 * each nail reads its card's on-screen box and draws itself there, in a pixel-
 * space orthographic view. Whatever moves the card moves the nail.
 */
function Nails({
  maps,
  tokens,
  root,
  hovered,
  pointer,
}: {
  maps: Map<string, DesignMaps>;
  tokens: Tokens;
  root: RefObject<HTMLElement | null>;
  hovered: { current: string | null };
  pointer: { current: Point };
}) {
  const { size } = useThree();

  const nails = useMemo(() => {
    const top = buildGrid(1, STEP);
    const under = buildGrid(-1, STEP);
    return [...maps.values()].map((design) => {
      const uniforms = createUniforms(design, design, tokens, STEP);
      const surfaceTop = new THREE.Mesh(top, makeMaterial(1, uniforms));
      const surfaceUnder = new THREE.Mesh(under, makeMaterial(-1, uniforms));
      surfaceTop.raycast = noRaycast;
      surfaceUnder.raycast = noRaycast;
      const inner = new THREE.Group();
      inner.rotation.x = Math.PI / 2; // grid lies in X–Z; stand it up, pattern to camera
      inner.add(surfaceTop, surfaceUnder);
      const flip = new THREE.Group();
      flip.rotation.z = Math.PI;
      flip.add(inner);
      const group = new THREE.Group();
      group.add(flip);
      group.visible = false;
      return { slug: design.slug, group, uniforms, meshes: [surfaceTop, surfaceUnder], lift: 0 };
    });
  }, [maps, tokens]);

  useEffect(
    () => () => {
      const geometries = new Set<THREE.BufferGeometry>();
      nails.forEach((nail) =>
        nail.meshes.forEach((mesh) => {
          geometries.add(mesh.geometry);
          (mesh.material as THREE.Material).dispose();
        }),
      );
      geometries.forEach((g) => g.dispose());
    },
    [nails],
  );

  useFrame((state) => {
    const stage = root.current;
    if (!stage) return;
    const t = state.clock.elapsedTime;
    const canvas = state.gl.domElement;
    const frame = canvas.getBoundingClientRect();

    // The nails share the plane's fade, so they arrive and leave with it.
    const plane = stage.querySelector<HTMLElement>("[data-plane]");
    canvas.style.opacity = plane ? getComputedStyle(plane).opacity : "1";

    const cards = new Map<string, HTMLElement>();
    stage.querySelectorAll<HTMLElement>("[data-live-card]").forEach((card) => {
      if (card.dataset.slug) cards.set(card.dataset.slug, card);
    });

    nails.forEach((nail, i) => {
      const card = cards.get(nail.slug);
      const box = card?.getBoundingClientRect();
      const onScreen =
        !!box && box.width > 4 && box.bottom > frame.top && box.top < frame.bottom && box.right > frame.left && box.left < frame.right;
      nail.group.visible = onScreen;
      if (!onScreen || !box) return;

      const isHovered = hovered.current === nail.slug;
      nail.lift += ((isHovered ? 1 : 0) - nail.lift) * 0.12;

      nail.group.position.set(
        box.left + box.width / 2 - frame.left - size.width / 2,
        size.height / 2 - (box.top + box.height / 2 - frame.top),
        0,
      );
      // The tilted card's on-screen box is larger than the card itself, so the
      // nail takes a smaller share of it to sit inside the frame.
      nail.group.scale.setScalar(Math.min(box.width / GRID_WIDTH, box.height / NAIL_LENGTH) * 0.62);
      // Tilted with the grid; the hovered nail stops swaying and squares up a little.
      nail.group.rotation.set(0, Math.sin(t * 0.6 + i) * 0.28 * (1 - nail.lift), -0.2 + nail.lift * 0.08);

      const u = nail.uniforms;
      u.uTime.value = t;
      u.uPointerStrength.value = nail.lift;
      if (isHovered) {
        u.uPointer.value.set(
          (pointer.current.x - box.left) / box.width,
          1 - (pointer.current.y - box.top) / box.height,
        );
      }
    });
  });

  return (
    <>
      {nails.map((nail) => (
        <primitive key={nail.slug} object={nail.group} />
      ))}
    </>
  );
}

export default function CollectionNails({
  slugs,
  root,
  hovered,
  pointer,
  onReady,
  onFail,
}: {
  slugs: string[];
  root: RefObject<HTMLElement | null>;
  hovered: { current: string | null };
  pointer: { current: Point };
  onReady: () => void;
  onFail: () => void;
}) {
  const [maps, setMaps] = useState<Map<string, DesignMaps> | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);

  useEffect(() => {
    // Colours follow the brand tokens rather than hardcoded hex.
    const css = getComputedStyle(document.documentElement);
    setTokens({
      glow: css.getPropertyValue("--color-turquoise").trim(),
      resin: css.getPropertyValue("--color-ink").trim(),
      ground: css.getPropertyValue("--color-ground").trim(),
    });
    let cancelled = false;
    Promise.all(slugs.map(loadMaps))
      .then((loaded) => {
        if (cancelled) return;
        setMaps(new Map(loaded.map((d) => [d.slug, d])));
        onReady();
      })
      .catch(() => !cancelled && onFail());
    return () => {
      cancelled = true;
    };
  }, [slugs, onReady, onFail]);

  return (
    <Canvas
      orthographic
      camera={{ zoom: 1, position: [0, 0, 1000], near: 1, far: 4000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        // If the GPU drops the context, the grid falls back to its stills.
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            onFail();
          },
          { once: true },
        );
      }}
      style={{ pointerEvents: "none" }}
    >
      <StudioEnvironment />
      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 3, 2.5]} intensity={1.7} />
      <directionalLight position={[-3, 1, -2]} intensity={1.1} />
      {maps && tokens && <Nails maps={maps} tokens={tokens} root={root} hovered={hovered} pointer={pointer} />}
    </Canvas>
  );
}
