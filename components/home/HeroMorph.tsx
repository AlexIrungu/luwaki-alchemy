"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { shapeStillSrc } from "@/lib/hero";
import { canMorph, morphKey } from "@/lib/morph";
import type { Shape } from "@/lib/catalogue";
import type { HoverInfo, SplitRef } from "@/components/three/HeroNail3D";

/** The real-time surface morph — desktop only, loaded as its own chunk. */
const HeroNail3D = dynamic(() => import("@/components/three/HeroNail3D"), { ssr: false });

export type HeroSlide = { slug: string; shape: Shape; name: string; collection: string | null };

const slideKey = (s: HeroSlide) => morphKey(s.slug, s.shape);

const HOLD = 2.8;
const MORPH = 1.6;

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/**
 * Noise dissolve between two shape tiles. Each is sampled "contain"-style — the
 * tiles are portrait, so the whole nail stays on screen at any viewport ratio,
 * over the ground colour; the outgoing image eases back while
 * the incoming one settles from a slight zoom, and a thin glow in the brand
 * turquoise rides the dissolving edge.
 */
const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec2 uImage;
uniform vec3 uGlow;
uniform vec3 uGround;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
vec2 contain(vec2 uv) {
  float screen = uResolution.x / uResolution.y, image = uImage.x / uImage.y;
  vec2 scale = screen > image ? vec2(screen / image, 1.0) : vec2(1.0, image / screen);
  return (uv - 0.5) * scale + 0.5;
}
void main() {
  vec2 uv = contain(vUv);
  float n = fbm(uv * 3.0);
  float t = uProgress * 1.4 - 0.2;
  float m = smoothstep(t - 0.2, t + 0.2, n);
  float edge = 1.0 - abs(m * 2.0 - 1.0);

  vec2 warp = (vec2(n) - 0.5) * edge * 0.035;
  vec2 fromUv = (uv - 0.5) * (1.0 + uProgress * 0.05) + 0.5 + warp;
  vec2 toUv = (uv - 0.5) * (1.06 - uProgress * 0.06) + 0.5 - warp;

  // Stills are transparent so they sit on either theme: composite over the ground.
  vec4 a = texture2D(uTo, toUv), b = texture2D(uFrom, fromUv);
  vec3 color = mix(mix(uGround, a.rgb, a.a), mix(uGround, b.rgb, b.a), m);
  color += uGlow * pow(edge, 3.0) * 0.35 * step(0.001, uProgress) * step(uProgress, 0.999);
  gl_FragColor = vec4(color, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Reads a brand token so the glow follows the palette instead of a hardcoded hex. */
function tokenRGB(name: string): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = parseInt(hex.replace("#", ""), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function HeroMorph({ slides, setDesigns = [] }: { slides: HeroSlide[]; setDesigns?: HeroSlide[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordRef = useRef<HTMLHeadingElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const [index, setIndex] = useState(0);
  const [webgl, setWebgl] = useState(true);

  // "3d": the live morph (desktop + WebGL2). "2d": the image dissolve (phones,
  // older GPUs). Reduced motion stays "pending" and simply shows the first still.
  const [mode, setMode] = useState<"pending" | "3d" | "2d">("pending");
  const [morphSlugs, setMorphSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    const webgl2 = Boolean(document.createElement("canvas").getContext("webgl2"));
    const modelled = slides.filter((s) => canMorph(s.slug, s.shape)).length >= 2;
    setMode(desktop && webgl2 && modelled ? "3d" : "2d");
  }, [slides]);

  // Memoised: a fresh array each render would make the 3D layer reload its maps.
  const morphable = useMemo(
    () => slides.filter((s) => canMorph(s.slug, s.shape)).map(({ slug, shape }) => ({ slug, shape })),
    [slides],
  );
  const setSlugs = useMemo(() => setDesigns.map((d) => d.slug).filter((slug) => canMorph(slug)), [setDesigns]);
  // Scroll progress through the pinned hero, read every frame by the 3D scene.
  const split = useRef(0) as SplitRef;

  // Hover label for the fanned set: follows the pointer, keeps its last text
  // while it fades out.
  const stageRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const designIndex = useMemo(
    () => new Map([...slides, ...setDesigns].map((d) => [d.slug, d])),
    [slides, setDesigns],
  );
  const [label, setLabel] = useState<{ name: string; collection: string | null; colour: string } | null>(null);
  const [labelOn, setLabelOn] = useState(false);
  const onMorphHover = useCallback(
    (info: HoverInfo) => {
      if (!info) return setLabelOn(false);
      const design = designIndex.get(info.slug);
      if (!design) return;
      setLabel({ name: design.name, collection: design.collection, colour: info.colour });
      setLabelOn(true);
    },
    [designIndex],
  );
  const onMorphReady = useCallback((slugs: string[]) => setMorphSlugs(slugs), []);
  const router = useRouter();
  const onMorphSelect = useCallback((slug: string) => router.push(`/designs/${slug}`), [router]);
  const onMorphFail = useCallback(() => {
    setMorphSlugs(null);
    setMode("2d");
  }, []);

  // One becomes ten (desktop 3D only): the hero pins for a stretch of scroll.
  // The wordmark and caption give way to the set's line as the nail fans out.
  useEffect(() => {
    const section = sectionRef.current;
    if (mode !== "3d" || !section) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => {
              split.current = self.progress;
            },
          },
        })
        .to("[data-hero-intro]", { opacity: 0, yPercent: -30, duration: 0.14 }, 0.04)
        .to("[data-hero-caption]", { opacity: 0, duration: 0.08 }, 0.04)
        .fromTo("[data-hero-set]", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2 }, 0.42)
        .to({}, { duration: 0.38 }, 0.62);
    }, section);

    // The hover label trails the pointer across the pinned stage.
    const stage = stageRef.current;
    const tooltip = tooltipRef.current;
    let onPointer: ((event: PointerEvent) => void) | null = null;
    if (stage && tooltip) {
      const toX = gsap.quickTo(tooltip, "x", { duration: 0.3, ease: "power3" });
      const toY = gsap.quickTo(tooltip, "y", { duration: 0.3, ease: "power3" });
      onPointer = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        toX(event.clientX - rect.left);
        toY(event.clientY - rect.top);
      };
      stage.addEventListener("pointermove", onPointer);
    }

    // The section just grew; everything below needs re-measuring.
    ScrollTrigger.refresh();
    return () => {
      if (stage && onPointer) stage.removeEventListener("pointermove", onPointer);
      ctx.revert();
    };
  }, [mode, split]);
  const onMorphChange = useCallback((key: string) => {
    setIndex((i) => {
      const found = slides.findIndex((s) => slideKey(s) === key);
      return found === -1 ? i : found;
    });
  }, [slides]);

  // Logo effect: the letters rise into place and the tracking settles, then
  // ALCHEMY arrives. Skipped entirely under reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const letters = wordRef.current?.querySelectorAll("[data-letter]");
    if (!letters?.length) return;

    const ctx = gsap.context(() => {
      gsap.timeline()
        .from(letters, { yPercent: 110, opacity: 0, duration: 1.1, ease: "power4.out", stagger: 0.07 })
        .from(wordRef.current, { letterSpacing: "0.6em", duration: 1.6, ease: "power3.out" }, 0)
        .from(tagRef.current, { opacity: 0, y: 12, duration: 0.8, ease: "power2.out" }, 0.9);
    });
    return () => ctx.revert();
  }, []);

  // The morph loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (mode !== "2d" || !canvas || !section || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      setWebgl(false);
      return;
    }

    let disposed = false;
    let timeline: gsap.core.Timeline | null = null;
    const textures: WebGLTexture[] = [];

    const program = gl.createProgram()!;
    try {
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
    } catch {
      setWebgl(false);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform3f(u("uGlow"), ...tokenRGB("--color-turquoise"));
    gl.uniform1i(u("uFrom"), 0);
    gl.uniform1i(u("uTo"), 1);

    const state = { progress: 0 };
    let from = 0;

    const draw = () => {
      if (disposed) return;
      gl.uniform1f(u("uProgress"), state.progress);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u("uResolution"), canvas.width, canvas.height);
      draw();
    };

    // The ground follows the theme, which can change while the loop runs.
    const paintGround = () => {
      gl.uniform3f(u("uGround"), ...tokenRGB("--color-ground"));
      draw();
    };
    paintGround();
    const themeObserver = new MutationObserver(paintGround);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", paintGround);

    const bind = (unit: number, slide: number) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[slide]);
    };

    const upload = (img: HTMLImageElement) => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      return texture;
    };

    const observer = new ResizeObserver(resize);

    // The first still is also the <img> underneath, so the page never waits on
    // the rest; later stills load in the background before the loop starts.
    Promise.all(slides.map((s) => loadImage(shapeStillSrc(s.slug, s.shape))))
      .then((images) => {
        if (disposed) return;
        gl.uniform2f(u("uImage"), images[0].naturalWidth, images[0].naturalHeight);
        images.forEach((img) => textures.push(upload(img)));
        observer.observe(canvas);
        bind(0, 0);
        bind(1, 1);
        resize();
        canvas.dataset.ready = "true";

        // The caption switches at the dissolve's midpoint — when the incoming
        // design is the one mostly on screen — not after it has finished.
        let captioned = false;
        timeline = gsap.timeline({ repeat: -1 });
        timeline
          .to(state, {
            progress: 1,
            duration: MORPH,
            ease: "power2.inOut",
            delay: HOLD,
            onUpdate: () => {
              draw();
              if (!captioned && state.progress >= 0.5) {
                captioned = true;
                setIndex((from + 1) % slides.length);
              }
            },
          })
          .call(() => {
            captioned = false;
            from = (from + 1) % slides.length;
            bind(0, from);
            bind(1, (from + 1) % slides.length);
            state.progress = 0;
            draw();
            setIndex(from);
          });
      })
      .catch(() => setWebgl(false));

    // Only animate while the hero is on screen and the tab is visible.
    const visibility = new IntersectionObserver(([entry]) => {
      if (!timeline) return;
      if (entry.isIntersecting && !document.hidden) timeline.resume();
      else timeline.pause();
    });
    visibility.observe(section);
    const onVisibility = () => timeline && (document.hidden ? timeline.pause() : timeline.resume());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      timeline?.kill();
      observer.disconnect();
      themeObserver.disconnect();
      scheme.removeEventListener("change", paintGround);
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [slides, mode]);

  // Without WebGL, fall back to a plain crossfade loop over the <img> stack.
  useEffect(() => {
    if (mode !== "2d" || webgl || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), (HOLD + MORPH) * 1000);
    return () => window.clearInterval(id);
  }, [mode, webgl, slides.length]);

  const current = slides[index];
  const morphReady = mode === "3d" && morphSlugs !== null;
  // In 3D the caption counts only the designs that can morph.
  const captionTotal = morphReady ? morphSlugs.length : slides.length;
  const captionPosition = morphReady ? Math.max(0, morphSlugs.indexOf(current ? slideKey(current) : "")) : index;

  return (
    <section ref={sectionRef} className={`relative bg-ground ${mode === "3d" ? "h-[260vh]" : ""}`}>
      <div ref={stageRef} className="sticky top-0 h-svh min-h-[32rem] overflow-hidden">
      {slides.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- the shader reads these same files; next/image would re-encode them to different URLs
        <img
          key={slideKey(slide)}
          src={shapeStillSrc(slide.slug, slide.shape)}
          alt=""
          aria-hidden="true"
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "auto"}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-1000 ${
            i === index && !morphReady ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {mode === "3d" && (
        <>
          {/* Dark studio: a soft pool of light for the nail to float in. */}
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,var(--color-panel-2),var(--color-ground)_62%)] transition-opacity duration-1000 ${
              morphReady ? "opacity-100" : "opacity-0"
            }`}
          />
          <div className="absolute inset-0">
            <HeroNail3D
              steps={morphable}
              setSlugs={setSlugs}
              split={split}
              onReady={onMorphReady}
              onChange={onMorphChange}
              onSelect={onMorphSelect}
              onHover={onMorphHover}
              onFail={onMorphFail}
            />
          </div>
        </>
      )}

      {mode === "2d" && webgl && slides.length > 1 && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ground/40 via-transparent to-ground/80" />

      <div data-hero-intro className="pointer-events-none relative flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 ref={wordRef} aria-label="LUWAKI" className="flex overflow-hidden font-display text-6xl tracking-[0.3em] md:text-8xl">
          {"LUWAKI".split("").map((letter, i) => (
            <span key={i} data-letter aria-hidden="true" className="inline-block">
              {letter}
            </span>
          ))}
        </h1>
        <p ref={tagRef} className="mt-6 font-mono text-[11px] tracking-[0.3em] text-ink-dim">
          ALCHEMY
        </p>
      </div>

      {mode === "3d" && (
        <div
          data-hero-set
          className="pointer-events-none absolute inset-x-0 top-[15vh] flex flex-col items-center px-6 text-center opacity-0"
        >
          {/* DRAFT COPY — Lucy owns the voice. */}
          <p className="font-display text-5xl font-light tracking-[0.08em] md:text-7xl">TEN NAILS. ONE SET.</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-dim">
            Choose a design for every finger — each one printed to your measurements.
          </p>
          <Link
            href="/collections"
            className="pointer-events-auto mt-8 font-mono text-[11px] tracking-[0.3em] text-ink-dim transition-colors hover:text-ink"
          >
            BUILD YOUR SET →
          </Link>
        </div>
      )}

      {mode === "3d" && (
        <div
          ref={tooltipRef}
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 z-40 ml-5 mt-5 transition-opacity duration-300 ${
            labelOn ? "opacity-100" : "opacity-0"
          }`}
        >
          {label && (
            <>
              <p className="font-display text-2xl font-light">{label.name}</p>
              <p className="mt-1 whitespace-nowrap font-mono text-[10px] tracking-[0.25em] text-ink-dim">
                {[label.collection, label.colour && `IN ${label.colour.toUpperCase()}`, "VIEW →"].filter(Boolean).join(" · ")}
              </p>
            </>
          )}
        </div>
      )}

      {current && (
        <Link
          data-hero-caption
          href={`/designs/${current.slug}`}
          className="absolute bottom-8 left-6 font-mono text-[10px] tracking-[0.25em] text-ink-dim transition-colors hover:text-ink md:left-10"
        >
          <span className="text-ink-faint">
            {String(captionPosition + 1).padStart(2, "0")} / {String(captionTotal).padStart(2, "0")}
          </span>{" "}
          · SHOP {current.name.toUpperCase()} — {current.shape.toUpperCase()} →
          {current.collection && <span className="text-ink-faint"> · {current.collection}</span>}
        </Link>
      )}
      </div>
    </section>
  );
}
