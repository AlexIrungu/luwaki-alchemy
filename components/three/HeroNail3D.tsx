"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { MORPH, morphKey } from "@/lib/morph";
import type { HeroStep } from "@/lib/hero";
import {
  type DesignMaps,
  type Tokens,
  buildGrid,
  createUniforms,
  loadMaps,
  makeHitPlane,
  makeMaterial,
  noRaycast,
} from "@/lib/three/surfaceMorph";
import { StudioEnvironment } from "@/components/three/StudioEnvironment";
import { SANZO } from "@/lib/sanzo";

/** Seconds a design holds, and how long the surface takes to become the next. */
const HOLD = 2.2;
const DURATION = 2.4;

/** Scroll progress (0–1) through the hero's pinned stretch, written by HeroMorph. */
export type SplitRef = { current: number };

/** Up to here the single nail is on screen; past it, the set of ten takes over. */
const SPLIT_START = 0.08;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));


function SurfaceMorph({
  steps,
  first,
  get,
  tokens,
  split,
  showing,
  onChange,
  onSelect,
}: {
  steps: HeroStep[];
  /** Maps for steps[0], already loaded. */
  first: DesignMaps;
  get: (step: HeroStep) => Promise<DesignMaps>;
  tokens: Tokens;
  split: SplitRef;
  showing: { current: string };
  onChange: (slug: string) => void;
  onSelect: (slug: string) => void;
}) {
  const rig = useRef<THREE.Group>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pausedForSplit = useRef(false);

  const scene = useMemo(() => {
    const uniforms = createUniforms(first, first, tokens, 1);
    const top = new THREE.Mesh(buildGrid(1), makeMaterial(1, uniforms));
    const underside = new THREE.Mesh(buildGrid(-1), makeMaterial(-1, uniforms));
    top.raycast = noRaycast;
    underside.raycast = noRaycast;

    // A soft pool of shadow under the floating nail, in the ground colour.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, tokens.ground);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.022),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, opacity: 0.9 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.023;

    const { bounds } = MORPH;
    const hit = makeHitPlane((bounds.x1 - bounds.x0) / 1000, (bounds.z1 - bounds.z0) / 1000);

    return { uniforms, top, underside, shadow, hit };
  }, [first, tokens]);

  useEffect(() => {
    const { uniforms } = scene;
    let current = 0;
    let cancelled = false;
    let retry = 0;

    const announce = (key: string) => {
      showing.current = key;
      onChange(key);
    };

    // Only what's playing is loaded: each change waits for its incoming maps and
    // warms the ones after, so a long sequence never downloads up front.
    const cycle = (from: DesignMaps) => {
      const next = (current + 1) % steps.length;
      get(steps[next])
        .then((to) => {
          if (cancelled) return;
          uniforms.uHA.value = from.height;
          uniforms.uCA.value = from.color;
          uniforms.uHB.value = to.height;
          uniforms.uCB.value = to.color;
          uniforms.uProgress.value = 0;
          void get(steps[(next + 1) % steps.length]).catch(() => {});

          timeline.current = gsap
            .timeline({
              delay: HOLD,
              paused: pausedForSplit.current,
              onComplete: () => {
                current = next;
                cycle(to);
              },
            })
            .to(uniforms.uProgress, { value: 1, duration: DURATION, ease: "sine.inOut" })
            .call(() => announce(to.key), [], DURATION * 0.5);
        })
        .catch(() => {
          // A step that won't load is skipped; the nail on screen simply holds a little longer.
          if (cancelled) return;
          current = next;
          retry = window.setTimeout(() => cycle(from), HOLD * 1000);
        });
    };

    announce(first.key);
    cycle(first);

    const onVisibility = () => {
      if (!timeline.current || pausedForSplit.current) return;
      if (document.hidden) timeline.current.pause();
      else timeline.current.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      timeline.current?.kill();
      document.removeEventListener("visibilitychange", onVisibility);
      [scene.top, scene.underside, scene.shadow, scene.hit].forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, [scene, steps, first, get, onChange, showing]);

  // Pointer → position on the maps (uv), eased so the ripple glides after it.
  const pointer = useMemo(() => {
    const { uniforms } = scene;
    return {
      x: gsap.quickTo(uniforms.uPointer.value, "x", { duration: 0.45, ease: "power3" }),
      y: gsap.quickTo(uniforms.uPointer.value, "y", { duration: 0.45, ease: "power3" }),
    };
  }, [scene]);

  const onMove = (event: ThreeEvent<PointerEvent>) => {
    const local = scene.top.worldToLocal(event.point.clone());
    const { bounds } = MORPH;
    pointer.x((local.x * 1000 - bounds.x0) / (bounds.x1 - bounds.x0));
    pointer.y((local.z * 1000 - bounds.z0) / (bounds.z1 - bounds.z0));
  };
  const onOver = () => {
    if (split.current > SPLIT_START) return;
    document.body.style.cursor = "pointer";
    gsap.to(scene.uniforms.uPointerStrength, { value: 1, duration: 0.6, ease: "power2.out", overwrite: true });
  };
  const onOut = () => {
    document.body.style.cursor = "";
    gsap.to(scene.uniforms.uPointerStrength, { value: 0, duration: 1.2, ease: "power2.out", overwrite: true });
  };
  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    scene.uniforms.uTime.value = t;

    // Scrolling freezes the morph; scrolling back to the top lets it run again.
    const splitting = split.current > 0.02;
    if (splitting !== pausedForSplit.current) {
      pausedForSplit.current = splitting;
      if (splitting) timeline.current?.pause();
      else timeline.current?.resume();
    }

    const single = split.current <= SPLIT_START;
    scene.shadow.visible = single;
    if (!rig.current) return;
    rig.current.visible = single;
    // The sway settles to face-on before the split, so the hand-off doesn't jump.
    rig.current.rotation.y = Math.sin(t * 0.35) * 0.6 * (1 - clamp01(split.current / SPLIT_START));
    rig.current.position.y = Math.sin(t * 0.8) * 0.0012;
  });

  return (
    <>
      <primitive object={scene.shadow} />
      <group rotation={[0.1, 0, -0.16]}>
        <group ref={rig}>
          {/* Grid lies in X–Z with the pattern on +Y: stand it up, pattern to camera. */}
          <group rotation={[0, 0, Math.PI]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <primitive object={scene.top} />
              <primitive object={scene.underside} />
              <primitive
                object={scene.hit}
                onPointerMove={onMove}
                onPointerOver={onOver}
                onPointerOut={onOut}
                onClick={() => split.current <= SPLIT_START && onSelect(showing.current)}
              />
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

/**
 * Where each of the ten sits when the set has fanned out: left pinky → right
 * pinky, the order lib/catalogue draws the cart's ten slots in. Two hands laid
 * side by side — middle fingers highest, thumbs low and leaning outward — with
 * the outer fingers set back in depth so the set reads as a fan, not a row.
 */
const HAND = [
  { x: -0.037, y: -0.005, z: -0.01, r: 0.24 },
  { x: -0.028, y: 0.005, z: -0.005, r: 0.12 },
  { x: -0.019, y: 0.009, z: -0.001, r: 0.03 },
  { x: -0.011, y: 0.004, z: -0.003, r: -0.07 },
  { x: -0.006, y: -0.012, z: 0.004, r: 0.32 },
];
const SET_SLOTS = [...HAND, ...[...HAND].reverse().map((s) => ({ ...s, x: -s.x, r: -s.r }))];
/** Slots nearest the centre first: the order nails peel away from the hero nail. */
const CENTRE_OUT = [4, 5, 3, 6, 2, 7, 1, 8, 0, 9];
const SET_SCALE = 0.46;
const SET_STEP = 3;

/**
 * Preview colours for the fanned set — Sanzo Wada pairings built around the
 * brand colours (plates 283 and 124), mirrored across the hands pinky → thumb.
 * A preview, like the colour picker: not a product colourway.
 */
const SET_COLOUR_NAMES = ["Pale Burnt Lake", "Ochre Red", "Yellow Ocher", "Chromium Green", "Venice Green"];
const SET_COLOURS = [...SET_COLOUR_NAMES, ...[...SET_COLOUR_NAMES].reverse()].map((name) => ({
  name,
  hex: SANZO.find((c) => c.name === name)?.hex ?? null,
}));

export type HoverInfo = { slug: string; colour: string } | null;

function TenSet({
  maps,
  first,
  order,
  tokens,
  split,
  showing,
  onSelect,
  onHover,
}: {
  /** Every bake loaded so far, by key — the set's coffins plus whatever the loop has shown. */
  maps: { current: Map<string, DesignMaps> };
  first: DesignMaps;
  /** The set's designs, as coffin keys. */
  order: string[];
  tokens: Tokens;
  split: SplitRef;
  showing: { current: string };
  onSelect: (slug: string) => void;
  onHover: (info: HoverInfo) => void;
}) {
  const { viewport } = useThree();
  const assigned = useRef(false);
  const hovered = useRef(-1);
  const lift = useRef<number[]>(SET_SLOTS.map(() => 0));

  const nails = useMemo(() => {
    const top = buildGrid(1, SET_STEP);
    const under = buildGrid(-1, SET_STEP);
    const hitGeometry = new THREE.PlaneGeometry(0.014, 0.036);

    return SET_SLOTS.map((slot, index) => {
      const uniforms = createUniforms(first, first, tokens, SET_STEP);
      const colour = SET_COLOURS[index];
      if (colour.hex) uniforms.uTint.value.set(colour.hex);

      const surfaceTop = new THREE.Mesh(top, makeMaterial(1, uniforms));
      const surfaceUnder = new THREE.Mesh(under, makeMaterial(-1, uniforms));
      surfaceTop.raycast = noRaycast;
      surfaceUnder.raycast = noRaycast;

      const hit = new THREE.Mesh(
        hitGeometry,
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
      );
      hit.rotation.x = -Math.PI / 2;

      const inner = new THREE.Group();
      inner.rotation.x = Math.PI / 2;
      inner.add(surfaceTop, surfaceUnder, hit);
      const flip = new THREE.Group();
      flip.rotation.z = Math.PI;
      flip.add(inner);
      const group = new THREE.Group();
      group.add(flip);
      group.visible = false;

      return {
        slot,
        group,
        uniforms,
        slug: first.slug,
        colour: colour.hex ? colour.name : "",
        meshes: [surfaceTop, surfaceUnder, hit],
      };
    });
  }, [first, tokens]);

  useEffect(
    () => () => {
      const geometries = new Set<THREE.BufferGeometry>();
      nails.forEach((n) =>
        n.meshes.forEach((mesh) => {
          geometries.add(mesh.geometry);
          (mesh.material as THREE.Material).dispose();
        }),
      );
      geometries.forEach((g) => g.dispose());
      document.body.style.cursor = "";
    },
    [nails],
  );

  useFrame((state) => {
    const p = split.current;

    // Fill the slots as the split begins: the design on screen stays centre
    // (left thumb), the rest fan out around it.
    if (p <= 0.02) assigned.current = false;
    if (p > 0.02 && !assigned.current) {
      // The nail on screen keeps its shape at the centre of the set.
      const chosen = [showing.current, ...order.filter((s) => s !== showing.current)].filter((s) => maps.current.has(s));
      CENTRE_OUT.forEach((slotIndex, rank) => {
        const design = maps.current.get(chosen[rank % chosen.length])!;
        const nail = nails[slotIndex];
        nail.slug = design.slug;
        nail.uniforms.uHA.value = design.height;
        nail.uniforms.uHB.value = design.height;
        nail.uniforms.uCA.value = design.color;
        nail.uniforms.uCB.value = design.color;
      });
      assigned.current = true;
    }

    // Scrolling back out of the fanned set clears any hover.
    if (p <= 0.4 && hovered.current !== -1) {
      hovered.current = -1;
      onHover(null);
      document.body.style.cursor = "";
    }

    const t = state.clock.elapsedTime;
    // Fit the set to the viewport both ways: narrow screens pull the hands in,
    // short ones shrink it so the thumbs stay above the fold.
    const fit = Math.min(1, viewport.aspect / 1.9, viewport.height / 0.056);
    const spread = clamp01((p - SPLIT_START) / 0.45);

    nails.forEach((nail, i) => {
      const rank = CENTRE_OUT.indexOf(i);
      const raw = clamp01(spread * 1.45 - rank * 0.05);
      const s = raw * raw * (3 - 2 * raw);
      // Until a nail starts to move it stays hidden, so ten don't flicker in one place.
      nail.group.visible = p > SPLIT_START && (rank === 0 || raw > 0);
      nail.uniforms.uTime.value = t;

      // Each nail travels in its own depth lane — alternately in front of and
      // behind the rest — so none pass through another, then settles into place.
      const lane = Math.sin(s * Math.PI) * (rank % 2 === 0 ? 1 : -1) * (0.004 + rank * 0.0012);

      // Hover lifts a nail toward the viewer and squares it up.
      lift.current[i] += ((hovered.current === i ? 1 : 0) - lift.current[i]) * 0.12;
      const up = lift.current[i];

      nail.group.position.set(
        nail.slot.x * fit * s,
        (nail.slot.y * fit + 0.002) * s + Math.sin(t * 0.8 + i) * 0.0008 * s + up * 0.003,
        nail.slot.z * s + lane + up * 0.008,
      );
      nail.group.rotation.set(
        0,
        // Outer fingers turn slightly toward the centre.
        (Math.sin(t * 0.5 + i) * 0.14 - nail.slot.x * 5) * s * (1 - up * 0.7),
        THREE.MathUtils.lerp(-0.16, nail.slot.r, s) * (1 - up * 0.25),
      );
      nail.group.scale.setScalar(THREE.MathUtils.lerp(1, SET_SCALE * fit, s) * (1 + up * 0.12));

      // The palette blooms in as the set settles.
      nail.uniforms.uTintAmount.value = nail.colour ? clamp01((s - 0.5) / 0.5) : 0;
    });
  });

  return (
    <group rotation={[0.1, 0, 0]}>
      {nails.map((nail, i) => (
        <primitive
          key={i}
          object={nail.group}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            if (split.current > 0.4) onSelect(nail.slug);
          }}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            if (split.current <= 0.4) return;
            hovered.current = i;
            document.body.style.cursor = "pointer";
            onHover({ slug: nail.slug, colour: nail.colour });
          }}
          onPointerOut={() => {
            if (hovered.current === i) {
              hovered.current = -1;
              onHover(null);
            }
            document.body.style.cursor = "";
          }}
        />
      ))}
    </group>
  );
}

/** Calls `onStart` the first frame the hero is scrolled at all. */
function SplitWatcher({ split, onStart }: { split: SplitRef; onStart: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current || split.current <= 0) return;
    fired.current = true;
    onStart();
  });
  return null;
}

/** Seconds after the loop starts before the set's maps load anyway, scrolled or not. */
const SET_PRELOAD_AFTER = 6;

export default function HeroNail3D({
  steps,
  setSlugs,
  split,
  onReady,
  onChange,
  onSelect,
  onHover,
  onFail,
}: {
  steps: HeroStep[];
  setSlugs: string[];
  split: SplitRef;
  /** Called with the loop's keys once the first maps are in. */
  onReady: (keys: string[]) => void;
  onChange: (key: string) => void;
  onSelect: (slug: string) => void;
  onHover: (info: HoverInfo) => void;
  onFail: () => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const showing = useRef("");
  const [first, setFirst] = useState<DesignMaps | null>(null);
  const [setReady, setSetReady] = useState(false);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  // Each bake is fetched and decoded once, however often the loop comes back to it.
  const pending = useRef(new Map<string, Promise<DesignMaps>>());
  const loaded = useRef(new Map<string, DesignMaps>());
  const get = useCallback((step: HeroStep) => {
    const key = morphKey(step.slug, step.shape);
    let promise = pending.current.get(key);
    if (!promise) {
      promise = loadMaps(step.slug, step.shape).then((maps) => {
        loaded.current.set(key, maps);
        return maps;
      });
      promise.catch(() => pending.current.delete(key));
      pending.current.set(key, promise);
    }
    return promise;
  }, []);

  const setStarted = useRef(false);
  const loadSet = useCallback(() => {
    if (setStarted.current || setSlugs.length === 0) return;
    setStarted.current = true;
    // The set only fans out on scroll, so its maps wait for the first scroll (or a few seconds).
    Promise.allSettled(setSlugs.map((slug) => get({ slug, shape: "coffin" }))).then(() => setSetReady(true));
  }, [setSlugs, get]);

  useEffect(() => {
    // Colours follow the brand tokens rather than hardcoded hex.
    const css = getComputedStyle(document.documentElement);
    setTokens({
      glow: css.getPropertyValue("--color-turquoise").trim(),
      resin: css.getPropertyValue("--color-shell").trim(),
      ground: css.getPropertyValue("--color-ground").trim(),
    });

    let cancelled = false;
    let preload = 0;
    if (steps.length < 2) {
      onFail();
      return;
    }
    Promise.all([get(steps[0]), get(steps[1])])
      .then(([maps]) => {
        if (cancelled) return;
        setFirst(maps);
        onReady(steps.map((step) => morphKey(step.slug, step.shape)));
        preload = window.setTimeout(loadSet, SET_PRELOAD_AFTER * 1000);
      })
      .catch(() => !cancelled && onFail());

    // Stop rendering entirely once the hero scrolls away.
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    if (wrapper.current) observer.observe(wrapper.current);
    return () => {
      cancelled = true;
      window.clearTimeout(preload);
      observer.disconnect();
    };
  }, [steps, get, loadSet, onReady, onFail]);

  const setOrder = useMemo(
    () => (setReady ? setSlugs.map((slug) => morphKey(slug)).filter((key) => loaded.current.has(key)) : []),
    [setReady, setSlugs],
  );

  return (
    <div ref={wrapper} className="h-full w-full">
      <Canvas
        frameloop={onScreen ? "always" : "never"}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          // If the GPU drops the context, hand over to the 2D dissolve instead of freezing.
          gl.domElement.addEventListener(
            "webglcontextlost",
            (event) => {
              event.preventDefault();
              onFail();
            },
            { once: true },
          );
        }}
        camera={{ fov: 28, near: 0.001, far: 10, position: [0, 0.004, 0.11] }}
      >
        <StudioEnvironment />
        <ambientLight intensity={0.45} />
        <directionalLight position={[2, 3, 2.5]} intensity={1.7} />
        <directionalLight position={[-3, 1, -2]} intensity={1.1} />
        {first && tokens && (
          <>
            <SplitWatcher split={split} onStart={loadSet} />
            <SurfaceMorph
              steps={steps}
              first={first}
              get={get}
              tokens={tokens}
              split={split}
              showing={showing}
              onChange={onChange}
              onSelect={onSelect}
            />
            {setOrder.length > 0 && (
              <TenSet
                maps={loaded}
                first={first}
                order={setOrder}
                tokens={tokens}
                split={split}
                showing={showing}
                onSelect={onSelect}
                onHover={onHover}
              />
            )}
          </>
        )}
      </Canvas>
    </div>
  );
}
