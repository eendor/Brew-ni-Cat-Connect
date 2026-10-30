import * as THREE from "three";

/**
 * Daylight Glass studio (DESIGN.md, ADR-022): the 3D scenes sit on the same
 * cream as the page, so a canvas edge never shows.
 */
export const STUDIO = {
  /** --surface-canvas */
  canvas: "#f6eee1",
} as const;

/** The renderer's tone mapping exposure. */
export const EXPOSURE = 0.95;

// three.js's ACES filmic curve (tonemapping_pars_fragment), run backwards so
// a color drawn through tone mapping lands on the screen exactly as designed
const ACES_IN = new THREE.Matrix3().set(
  0.59719,
  0.35458,
  0.04823,
  0.076,
  0.90834,
  0.01566,
  0.0284,
  0.13383,
  0.83777,
);
const ACES_OUT = new THREE.Matrix3().set(
  1.60475,
  -0.53108,
  -0.07367,
  -0.10208,
  1.10813,
  -0.00605,
  -0.00327,
  -0.07276,
  1.07602,
);
const IN_INV = ACES_IN.clone().invert();
const OUT_INV = ACES_OUT.clone().invert();
const FIT = { a1: 0.0245786, a2: 0.000090537, b1: 0.983729, b2: 0.432951 };
const B3 = 0.238081;
/** Colors this close to white have no exact source; they're capped. */
const MAX = 0.98;

/** Undoes RRTAndODTFit for one channel: the positive root of its quadratic. */
function unfit(f: number) {
  const y = Math.min(Math.max(f, 0), MAX);
  const a = y * FIT.b1 - 1;
  const b = y * FIT.b2 - FIT.a1;
  const c = y * B3 + FIT.a2;
  return (-b - Math.sqrt(Math.max(b * b - 4 * a * c, 0))) / (2 * a);
}

/**
 * The linear color that tone mapping turns into `color` on screen. Used for
 * backgrounds that go through tone mapping (scenes drawn with post effects).
 */
export function untonemapped(color: THREE.ColorRepresentation) {
  const target = new THREE.Color(color);
  const v = new THREE.Vector3(target.r, target.g, target.b)
    .clampScalar(0, MAX)
    .applyMatrix3(OUT_INV);
  v.set(unfit(v.x), unfit(v.y), unfit(v.z))
    .applyMatrix3(IN_INV)
    .max(new THREE.Vector3())
    .multiplyScalar(0.6 / EXPOSURE);
  return target.setRGB(v.x, v.y, v.z, THREE.LinearSRGBColorSpace);
}

/**
 * The page cream as a scene background. With post effects the background is
 * tone mapped with the rest of the frame; drawn straight to the canvas it
 * isn't, so it takes the plain color.
 */
export function studioBackground(post: boolean) {
  return post ? untonemapped(STUDIO.canvas) : new THREE.Color(STUDIO.canvas);
}

const glslMat = (m: THREE.Matrix3) =>
  `mat3(${m.elements.map((n) => n.toFixed(6)).join(", ")})`;

/**
 * GLSL `untonemap(color)`: the same inverse inside a shader, so a backdrop is
 * designed in on-screen colors and still goes through tone mapping once,
 * like everything in front of it (and seen through glass).
 */
export const UNTONEMAP_GLSL = /* glsl */ `
  vec3 untonemap(vec3 c){
    vec3 f = clamp(${glslMat(OUT_INV)} * clamp(c, 0.0, ${MAX.toFixed(2)}), 0.0, ${MAX.toFixed(2)});
    vec3 a = f * ${FIT.b1.toFixed(6)} - 1.0;
    vec3 b = f * ${FIT.b2.toFixed(6)} - ${FIT.a1.toFixed(7)};
    vec3 k = f * ${B3.toFixed(6)} + ${FIT.a2.toFixed(9)};
    vec3 v = (-b - sqrt(max(b * b - 4.0 * a * k, 0.0))) / (2.0 * a);
    return max(${glslMat(IN_INV)} * v, 0.0) * ${(0.6 / EXPOSURE).toFixed(6)};
  }`;
