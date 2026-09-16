import * as THREE from "three";
import { MORPH, morphColorSrc, morphHeightSrc, morphKey } from "@/lib/morph";
import type { Shape } from "@/lib/catalogue";

/**
 * The surface-morph core shared by the home hero and UNIVERSE. Every design is
 * baked to height + colour maps on one coffin grid (scripts/morph/bake.py); a
 * grid mesh is lifted by a shader that blends two designs.
 *
 * UNIVERSE-only effects ride on the same shader and are off by default:
 * printing (uPrintOn / uPrintLevel), coming apart (uExplode), and a wireframe
 * variant (makeWireMaterial).
 */

export type DesignMaps = { slug: string; shape: Shape; key: string; height: THREE.DataTexture; color: THREE.Texture };
export type Tokens = { glow: string; resin: string; ground: string };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Two-pass chamfer distance (in texels) from every `true` cell to the nearest
 * `false` one, capped. `edgeIsBoundary` treats the image border as outside.
 */
function chamfer(mask: Uint8Array, W: number, H: number, edgeIsBoundary: boolean, cap: number) {
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = mask[i] ? 1e6 : 0;
  const diagonal = Math.SQRT2;
  const edge = edgeIsBoundary ? 1 : 1e6;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (dist[i] === 0) continue;
      let d = dist[i];
      d = x > 0 ? Math.min(d, dist[i - 1] + 1) : Math.min(d, edge);
      if (y > 0) {
        d = Math.min(d, dist[i - W] + 1);
        if (x > 0) d = Math.min(d, dist[i - W - 1] + diagonal);
        if (x < W - 1) d = Math.min(d, dist[i - W + 1] + diagonal);
      } else d = Math.min(d, edge);
      dist[i] = d;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (dist[i] === 0) continue;
      let d = dist[i];
      d = x < W - 1 ? Math.min(d, dist[i + 1] + 1) : Math.min(d, edge);
      if (y < H - 1) {
        d = Math.min(d, dist[i + W] + 1);
        if (x < W - 1) d = Math.min(d, dist[i + W + 1] + diagonal);
        if (x > 0) d = Math.min(d, dist[i + W - 1] + diagonal);
      } else d = Math.min(d, edge);
      dist[i] = d;
    }
  }
  for (let i = 0; i < W * H; i++) dist[i] = Math.min(dist[i], cap);
  return dist;
}

/**
 * Decodes a bake into textures. Heights come back as millimetres in a float
 * texture: R top surface, G underside, B inside-mask, A signed distance to the
 * outline in texels (positive inside, negative outside). Blending two signed
 * distances is what lets one shape's outline flow into another's.
 */
export async function loadMaps(slug: string, shape: Shape = "coffin"): Promise<DesignMaps> {
  const [img, color] = await Promise.all([
    loadImage(morphHeightSrc(slug, shape)),
    new THREE.TextureLoader().loadAsync(morphColorSrc(slug, shape)),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, img.width, img.height).data;

  const { y0, y1 } = MORPH.bounds;
  const span = y1 - y0;
  const data = new Float32Array(img.width * img.height * 4);
  for (let i = 0; i < img.width * img.height; i++) {
    const t16 = (px[i * 4] << 8) | px[i * 4 + 1];
    const inside = t16 > 0;
    data[i * 4] = inside ? ((t16 - 1) / 65534) * span + y0 : 0;
    data[i * 4 + 1] = inside ? (px[i * 4 + 2] / 255) * span + y0 : 0;
    data[i * 4 + 2] = inside ? 1 : 0;
    data[i * 4 + 3] = 0;
  }

  // A channel: signed distance to the outline in texels. Inside is measured to
  // the nearest outside texel (so it also rounds the rim and keeps spines off
  // it); outside to the nearest inside one, capped well past any shape change.
  const W = img.width;
  const H = img.height;
  const inside = new Uint8Array(W * H);
  const outside = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    inside[i] = data[i * 4 + 2] > 0 ? 1 : 0;
    outside[i] = 1 - inside[i];
  }
  const toEdge = chamfer(inside, W, H, true, 64);
  const toNail = chamfer(outside, W, H, false, 64);
  for (let i = 0; i < W * H; i++) data[i * 4 + 3] = inside[i] ? toEdge[i] : -toNail[i];

  const height = new THREE.DataTexture(data, img.width, img.height, THREE.RGBAFormat, THREE.FloatType);
  height.minFilter = THREE.NearestFilter;
  height.magFilter = THREE.NearestFilter;
  height.needsUpdate = true;

  // Colours are baked linear; row 0 of both maps is the same end of the nail.
  color.flipY = false;
  color.generateMipmaps = false;
  color.minFilter = THREE.LinearFilter;
  color.needsUpdate = true;

  return { slug, shape, key: morphKey(slug, shape), height, color };
}

/**
 * One grid vertex per sampled texel centre, lying flat; the shader lifts it.
 * `step` samples every nth texel — coarser grids for small nails and wireframes.
 */
export function buildGrid(side: 1 | -1, step = 1) {
  const { width: W, height: H, cell, bounds } = MORPH;
  const cols = Math.floor((W - 1) / step) + 1;
  const rows = Math.floor((H - 1) / step) + 1;
  const position = new Float32Array(cols * rows * 3);
  const morphUv = new Float32Array(cols * rows * 2);
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const i = z * cols + x;
      const tx = x * step;
      const tz = z * step;
      position[i * 3] = (bounds.x0 + (tx + 0.5) * cell) / 1000;
      position[i * 3 + 2] = (bounds.z0 + (tz + 0.5) * cell) / 1000;
      morphUv[i * 2] = (tx + 0.5) / W;
      morphUv[i * 2 + 1] = (tz + 0.5) / H;
    }
  }

  const index = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let z = 0; z < rows - 1; z++) {
    for (let x = 0; x < cols - 1; x++) {
      const a = z * cols + x;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Counter-clockwise seen from +Y for the top surface, reversed below.
      if (side > 0) index.set([a, c, b, b, c, d], k);
      else index.set([a, b, c, b, d, c], k);
      k += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("morphUv", new THREE.BufferAttribute(morphUv, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  // Heights are applied in the shader, so give culling an honest bound.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.03);
  return geometry;
}

const VERTEX_COMMON = `
attribute vec2 morphUv;
uniform sampler2D uHA;
uniform sampler2D uHB;
uniform sampler2D uCA;
uniform sampler2D uCB;
uniform float uProgress;
uniform vec2 uTexel;
uniform float uCell;
uniform float uSide;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uTime;
uniform vec2 uGridMM;
uniform float uExplode;
varying float vT;
varying float vMask;
varying float vThick;
varying float vLocalZ;
varying float vObjNormalY;
varying vec2 vMorphUv;
varying float vSdf;

float mHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mHash(i), mHash(i + vec2(1.0, 0.0)), u.x),
             mix(mHash(i + vec2(0.0, 1.0)), mHash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// The outline changes as one smooth sweep, not per region: a staggered outline
// would fray. Same shape on both sides, and this changes nothing.
float mShapeT() { return smoothstep(0.1, 0.9, uProgress); }

// Signed distance to the outline in texels, part-way from A's shape to B's.
float mSdf(vec2 uv) { return mix(texture2D(uHA, uv).a, texture2D(uHB, uv).a, mShapeT()); }

// Surface height (metres) at uv, part-way (t) from design A to design B.
// Outside the outline both surfaces rest on the midline, so top and underside
// meet at the silhouette. Mid-change, short spines rise and fall, then settle
// into the next design. Under the cursor the resin ripples and the same spines
// rise, so the nail answers to touch.
float mSurface(vec2 uv, float t) {
  vec4 a = texture2D(uHA, uv);
  vec4 b = texture2D(uHB, uv);
  float ha = mix(0.0, uSide > 0.0 ? a.r : a.g, a.b);
  float hb = mix(0.0, uSide > 0.0 ? b.r : b.g, b.b);
  // Heights ease down over the last couple of texels of the (moving) outline,
  // so the rim is rounded rather than a cliff while a shape grows or recedes.
  float sdf = mix(a.a, b.a, mShapeT());
  float rim = smoothstep(0.0, 2.5, sdf);
  // Spines and ripples stay off the rim — out there they break into specks.
  float inside = smoothstep(2.0, 5.0, sdf) * step(0.0, uSide);

  float d = length((uv - uPointer) * uGridMM);                 // millimetres from the cursor
  float touch = uPointerStrength * exp(-d * d / 8.0) * inside;
  float ripple = touch * (0.55 + 0.45 * sin(d * 2.4 - uTime * 5.0)) * 0.8;

  float growth = max(sin(t * 3.14159), touch);
  float spines = smoothstep(0.62, 1.0, mNoise(uv * vec2(70.0, 160.0))) * 1.8 * growth * inside;

  // Coming apart (UNIVERSE): the modelled pattern lifts off the resin shell.
  float pattern = step(0.8, mix(texture2D(uCA, uv).a, texture2D(uCB, uv).a, t));
  float lift = uExplode * (uSide > 0.0 ? pattern : -0.4);

  return (mix(ha, hb, t) * rim + spines + ripple + lift) * 0.001;
}
`;

/** Per-vertex blend position, mask and thickness — shared by solid and wireframe. */
const VERTEX_PROGRESS = `
vMorphUv = morphUv;
vSdf = mSdf(morphUv);
// Each region changes at its own moment, so the change sweeps across the nail.
float mStagger = mNoise(morphUv * vec2(5.0, 12.0)) * 0.7 + mNoise(morphUv * vec2(17.0, 40.0)) * 0.3;
float mRaw = clamp(uProgress * 1.6 - mStagger * 0.6, 0.0, 1.0);
vT = mRaw * mRaw * (3.0 - 2.0 * mRaw);
vec3 mTA = texture2D(uHA, morphUv).rgb;
vec3 mTB = texture2D(uHB, morphUv).rgb;
vMask = mix(mTA.b, mTB.b, vT);
// Resin thickness (mm) — thin areas are where light gets through.
vThick = mix((mTA.r - mTA.g) * mTA.b, (mTB.r - mTB.g) * mTB.b, vT);
`;

const VERTEX_NORMAL = `
${VERTEX_PROGRESS}
float mL = mSurface(morphUv - vec2(uTexel.x, 0.0), vT);
float mR = mSurface(morphUv + vec2(uTexel.x, 0.0), vT);
float mD = mSurface(morphUv - vec2(0.0, uTexel.y), vT);
float mU = mSurface(morphUv + vec2(0.0, uTexel.y), vT);
vec3 objectNormal = normalize(vec3(mL - mR, 2.0 * uCell, mD - mU)) * uSide;
vObjNormalY = abs(objectNormal.y);
`;

const VERTEX_POSITION = `
vec3 transformed = vec3(position.x, mSurface(morphUv, vT), position.z);
vLocalZ = position.z;
`;

const FRAGMENT_COMMON = `
uniform sampler2D uCA;
uniform sampler2D uCB;
uniform vec3 uGlow;
uniform vec3 uResin;
uniform float uSide;
uniform vec3 uTint;
uniform float uTintAmount;
uniform float uPrintOn;
uniform float uPrintLevel;
uniform float uExplode;
varying float vT;
varying float vMask;
varying float vThick;
varying float vLocalZ;
varying float vObjNormalY;
varying vec2 vMorphUv;
varying float vSdf;
`;

const FRAGMENT_COLOR = `
vec4 mA = texture2D(uCA, vMorphUv);
vec4 mB = texture2D(uCB, vMorphUv);
// The signed distance is interpolated between grid vertices, so trimming
// against it gives a smooth outline instead of the grid's stair-steps — and the
// same test follows the outline while one shape becomes another.
if (vSdf < 0.0) discard;
// Printing (UNIVERSE): nothing above the current layer exists yet.
if (uPrintOn > 0.5 && vLocalZ > uPrintLevel) discard;
// Coming apart (UNIVERSE): the walls stretched between lifted pattern and
// shell vanish, so the two read as separate pieces.
if (uExplode > 0.15 && vObjNormalY < 0.25) discard;
// Alpha marks what the texel is: 1.0 pattern, ~0.63 resin shell. A tint
// recolours only the pattern; the resin stays resin.
vec3 mColA = mA.a > 0.8 ? mix(mA.rgb, uTint, uTintAmount) : uResin;
vec3 mColB = mB.a > 0.8 ? mix(mB.rgb, uTint, uTintAmount) : uResin;
diffuseColor.rgb = uSide > 0.0 ? mix(mColA, mColB, vT) : uResin;
`;

const FRAGMENT_EMISSIVE = [
  "#include <emissivemap_fragment>",
  "totalEmissiveRadiance += uGlow * sin(vT * 3.14159) * 0.25;",
  // Light through the resin: strongest where it is thin and seen edge-on, and
  // on bare shell more than on the pattern — far less on a tinted pattern, or
  // the colour washes to pastel.
  "float mRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);",
  "float mThin = 1.0 - smoothstep(0.8, 4.0, vThick);",
  "float mShell = uSide > 0.0 ? mix(mA.a < 0.8 ? 1.0 : 0.35 * (1.0 - uTintAmount * 0.85), mB.a < 0.8 ? 1.0 : 0.35 * (1.0 - uTintAmount * 0.85), vT) : 0.6;",
  "totalEmissiveRadiance += mix(uResin, uGlow, 0.35) * (0.25 + mRim) * mThin * mShell * 0.45;",
  // Printing: a bright band at the layer being cured, faint layer lines below.
  "float mBand = uPrintOn > 0.5 ? exp(-pow((uPrintLevel - vLocalZ) * 2500.0, 2.0)) : 0.0;",
  "float mLayers = uPrintOn > 0.5 ? step(0.5, fract(vLocalZ * 2000.0)) * 0.06 : 0.0;",
  "totalEmissiveRadiance += uGlow * (mBand * 2.0 + mLayers);",
].join("\n");

export type SharedUniforms = {
  uHA: { value: THREE.Texture };
  uHB: { value: THREE.Texture };
  uCA: { value: THREE.Texture };
  uCB: { value: THREE.Texture };
  uProgress: { value: number };
  uTexel: { value: THREE.Vector2 };
  uCell: { value: number };
  uGlow: { value: THREE.Color };
  uResin: { value: THREE.Color };
  uPointer: { value: THREE.Vector2 };
  uPointerStrength: { value: number };
  uTime: { value: number };
  uGridMM: { value: THREE.Vector2 };
  uTint: { value: THREE.Color };
  uTintAmount: { value: number };
  uPrintOn: { value: number };
  uPrintLevel: { value: number };
  uExplode: { value: number };
};

export function createUniforms(a: DesignMaps, b: DesignMaps, tokens: Tokens, step: number): SharedUniforms {
  return {
    uHA: { value: a.height },
    uHB: { value: b.height },
    uCA: { value: a.color },
    uCB: { value: b.color },
    uProgress: { value: 0 },
    // Normals sample neighbours one grid step away — wider on coarse grids.
    uTexel: { value: new THREE.Vector2(step / MORPH.width, step / MORPH.height) },
    uCell: { value: (MORPH.cell * step) / 1000 },
    uGlow: { value: new THREE.Color(tokens.glow) },
    uResin: { value: new THREE.Color(tokens.resin).multiplyScalar(0.85) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerStrength: { value: 0 },
    uTime: { value: 0 },
    uGridMM: { value: new THREE.Vector2(MORPH.bounds.x1 - MORPH.bounds.x0, MORPH.bounds.z1 - MORPH.bounds.z0) },
    uTint: { value: new THREE.Color() },
    uTintAmount: { value: 0 },
    uPrintOn: { value: 0 },
    uPrintLevel: { value: 1 },
    uExplode: { value: 0 },
  };
}

export function makeMaterial(side: 1 | -1, shared: SharedUniforms) {
  const material = new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, { uSide: { value: side } });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_COMMON}`)
      .replace("#include <beginnormal_vertex>", VERTEX_NORMAL)
      .replace("#include <begin_vertex>", VERTEX_POSITION);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_COMMON}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAGMENT_COLOR}`)
      .replace("#include <emissivemap_fragment>", FRAGMENT_EMISSIVE);
  };
  material.customProgramCacheKey = () => `luwaki-surface-morph-${side}`;
  return material;
}

/**
 * The same lifted surface drawn as lines in the glow colour — UNIVERSE's DESIGN
 * step. Use a coarse grid (`buildGrid(1, 6)`): at full density the lines merge
 * into a solid. Opacity is the material's own.
 */
export function makeWireMaterial(shared: SharedUniforms) {
  const material = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.5, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, { uSide: { value: 1 } });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_COMMON}`)
      .replace("#include <begin_vertex>", `${VERTEX_PROGRESS}\n${VERTEX_POSITION}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_COMMON}`)
      .replace(
        "#include <color_fragment>",
        [
          "#include <color_fragment>",
          "if (vSdf < 0.0) discard;",
          "diffuseColor.rgb = uGlow;",
        ].join("\n"),
      );
  };
  material.customProgramCacheKey = () => "luwaki-surface-wire";
  return material;
}

/** A transparent stand-in the cursor can hit cheaply; the real surfaces opt out of raycasting. */
export function makeHitPlane(width: number, length: number) {
  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  hit.rotation.x = -Math.PI / 2; // into the grid's X–Z plane
  return hit;
}

export const noRaycast = () => {};
