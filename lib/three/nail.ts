import * as THREE from "three";

/**
 * Shared handling for Kent's nail exports — used by the DESCRIPTION viewer and
 * the UNIVERSE print sequence, so both read the geometry the same way.
 */

export const DRACO_PATH = "/draco/";

/**
 * Every export carries a thin print tab (~3 × 1 × 27 mm, a few hundred
 * vertices) alongside the nail. It is production scaffolding, not the design.
 */
export function isPrintTab(mesh: THREE.Mesh) {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  const [a, b, c] = [size.x, size.y, size.z].sort((m, n) => m - n);
  return a < 0.0015 && b < 0.004 && c > 0.02 && geometry.attributes.position.count < 400;
}

/**
 * Clones a loaded scene so it can be changed freely: useGLTF caches by URL and
 * Object3D.clone() shares materials, so the materials are cloned too — or a
 * change on one design leaks into every other use of the cached scene.
 *
 * Also hides the print tab and classifies each material once, from its colour
 * as exported: the colourless one is the resin shell, the rest is the modelled
 * pattern. Re-testing after a colourway is applied would misread a pale pick
 * (White) as the shell.
 */
export function prepareNail(scene: THREE.Object3D) {
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

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshPhysicalMaterial)) return;
      material.userData.isShell = material.color.getHSL({ h: 0, s: 0, l: 0 }).s < 0.15;
      material.userData.exported = material.color.clone();
    });
  });
  return copy;
}

/** Visits every physical material on the visible meshes. */
export function eachMaterial(root: THREE.Object3D, fn: (material: THREE.MeshPhysicalMaterial) => void) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshPhysicalMaterial) fn(material);
    });
  });
}

/**
 * The resin finish. The shell is translucent — the export declares
 * transmission without a factor, so it's restored here. Only the pattern takes
 * a colourway; `null` returns it to the colour as exported.
 */
export function applyFinish(material: THREE.MeshPhysicalMaterial, color: string | null) {
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
}
