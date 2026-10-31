import * as THREE from "three";

import {
  readTheme,
  subscribeTheme,
  THEME_COLOR,
  type Theme,
} from "@/lib/theme/theme";

/**
 * Daylight Glass studio (DESIGN.md, ADR-022): the 3D scenes sit on the same
 * color as the page, so a canvas edge never shows. By day that is the cream;
 * at night (ADR-024) the espresso dark.
 */
export const STUDIO = {
  /** --surface-canvas by day */
  canvas: THEME_COLOR.day,
  /** --surface-canvas at night */
  night: THEME_COLOR.night,
} as const;

/** The page's canvas color in a theme. */
export function studioCanvas(theme: Theme) {
  return theme === "night" ? STUDIO.night : STUDIO.canvas;
}

/** The theme on the page now, for a scene being built. */
export const currentTheme = readTheme;

/**
 * Calls `apply` with the page's theme now, and again each time the toggle
 * changes it, so a scene recolors in place instead of being rebuilt. A scene
 * calls this once it is built (a build that fails leaves nothing behind) and
 * stops following when it is disposed.
 */
export function followTheme(apply: (theme: Theme) => void) {
  apply(readTheme());
  return subscribeTheme(() => apply(readTheme()));
}

/**
 * The renderer's tone mapping: Khronos PBR Neutral, made for showing
 * products in their own colors. ACES filmic bleached and greyed the drinks,
 * ice and leaves on the light studio.
 */
export const TONE_MAPPING = THREE.NeutralToneMapping;

/** The renderer's tone mapping exposure. */
export const EXPOSURE = 1.1;

// three.js's Neutral curve (tonemapping_pars_fragment), run backwards so a
// color drawn through tone mapping lands on the screen exactly as designed
const START = 0.8 - 0.04;
const DESATURATION = 0.15;
const D = 1 - START;
/** Colors this close to white have no exact source; they're capped. */
const MAX = 0.98;

/** Undoes the curve's highlight roll-off, then its shadow offset. */
function unneutral(rgb: readonly number[]) {
  let c = rgb.map((v) => Math.min(Math.max(v, 0), MAX));
  const top = Math.max(...c);
  if (top >= START) {
    const peak = (D * D) / (1 - top) - D + START;
    const g = 1 - 1 / (DESATURATION * (peak - top) + 1);
    c = c.map((v) => ((v - g * top) / (1 - g)) * (peak / top));
  }
  const low = Math.max(Math.min(...c), 0);
  const offset = low >= 0.04 ? 0.04 : Math.sqrt(low / 6.25) - low;
  return c.map((v) => Math.max(v + offset, 0) / EXPOSURE);
}

/**
 * The linear color that tone mapping turns into `color` on screen. Used for
 * backgrounds that go through tone mapping (scenes drawn with post effects).
 */
export function untonemapped(color: THREE.ColorRepresentation) {
  const target = new THREE.Color(color);
  const [r = 0, g = 0, b = 0] = unneutral([target.r, target.g, target.b]);
  return target.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

/**
 * The page color as a scene background. With post effects the background is
 * tone mapped with the rest of the frame; drawn straight to the canvas it
 * isn't, so it takes the plain color.
 */
export function studioBackground(post: boolean, theme: Theme = "day") {
  const canvas = studioCanvas(theme);
  return post ? untonemapped(canvas) : new THREE.Color(canvas);
}

const f = (n: number) => n.toFixed(6);

/**
 * GLSL `untonemap(color)`: the same inverse inside a shader, so a backdrop is
 * designed in on-screen colors and still goes through tone mapping once,
 * like everything in front of it (and seen through glass).
 */
export const UNTONEMAP_GLSL = /* glsl */ `
  vec3 untonemap(vec3 c){
    c = clamp(c, 0.0, ${f(MAX)});
    float top = max(c.r, max(c.g, c.b));
    if (top >= ${f(START)}) {
      float peak = ${f(D * D)} / (1.0 - top) - ${f(D)} + ${f(START)};
      float g = 1.0 - 1.0 / (${f(DESATURATION)} * (peak - top) + 1.0);
      c = (c - g * top) / (1.0 - g) * (peak / top);
    }
    float low = max(min(c.r, min(c.g, c.b)), 0.0);
    float offset = low >= 0.04 ? 0.04 : sqrt(low / 6.25) - low;
    return max(c + offset, 0.0) / ${f(EXPOSURE)};
  }`;

/** --text-strong: the page's ink. */
const INK = new THREE.Color("#1d2a21");

/**
 * The product name on a 3D wall: a deep shade of the item's color. Every
 * color is brought to the same brightness and a fifth of the page's ink is
 * mixed in, so each name reads on the cream at 4.5:1 or better. `shade` runs
 * from the bottom of the letters to the top, like an acrylic panel catching
 * the daylight.
 */
export const TITLE_FACE = {
  luminance: 0.15,
  ink: 0.2,
  shade: [0.85, 1.15],
} as const;

const luminanceOf = (c: THREE.Color) =>
  0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** The name's linear on-screen color at `y` (0 bottom, 1 top). */
export function titleFace(glow: THREE.ColorRepresentation, y: number) {
  const color = new THREE.Color(glow);
  const [low, high] = TITLE_FACE.shade;
  return color
    .multiplyScalar(TITLE_FACE.luminance / Math.max(luminanceOf(color), 1e-3))
    .lerp(INK, TITLE_FACE.ink)
    .multiplyScalar(low + (high - low) * y);
}

/** --text-strong at night: the cream a name is mixed toward. */
const CREAM = new THREE.Color(THEME_COLOR.day);

/**
 * The product name at night: a light shade of the item's color on the dark
 * wall. Every color is brought up to the same brightness (each channel capped
 * at full), then mixed with the cream text color, so each name reads at 4.5:1
 * or better on the wall and 3:1 or better on the item's glow (WALL_WASH). It
 * is brightest at the top, like a lit sign.
 */
export const TITLE_FACE_NIGHT = {
  luminance: 0.5,
  cream: 0.35,
  shade: [0.85, 1],
} as const;

/**
 * How much of the item's color washes the wall behind the product. Half as
 * much at night, where a bright glow on the dark wall would sit too close to
 * the light names and page text in front of it.
 */
export const WALL_WASH = { day: 0.32, night: 0.16 } as const;

/** GLSL `wallWash(night)`: the wash amount for a 0 (day) to 1 (night) blend. */
export const WALL_WASH_GLSL = /* glsl */ `
  float wallWash(float night){
    return mix(${f(WALL_WASH.day)}, ${f(WALL_WASH.night)}, night);
  }`;

/** The night name's linear on-screen color at `y` (0 bottom, 1 top). */
export function titleFaceNight(glow: THREE.ColorRepresentation, y: number) {
  const color = new THREE.Color(glow);
  color.multiplyScalar(
    TITLE_FACE_NIGHT.luminance / Math.max(luminanceOf(color), 1e-3),
  );
  color.setRGB(
    Math.min(color.r, 1),
    Math.min(color.g, 1),
    Math.min(color.b, 1),
    THREE.LinearSRGBColorSpace,
  );
  const [low, high] = TITLE_FACE_NIGHT.shade;
  return color
    .lerp(CREAM, TITLE_FACE_NIGHT.cream)
    .multiplyScalar(low + (high - low) * y);
}

/**
 * GLSL `titleFace(glow, y)` and `titleFaceNight(glow, y)`: the same colors
 * inside a shader.
 */
export const TITLE_FACE_GLSL = /* glsl */ `
  vec3 titleFace(vec3 glow, float y){
    float lum = max(dot(glow, vec3(0.2126, 0.7152, 0.0722)), 0.001);
    vec3 deep = mix(glow * (${f(TITLE_FACE.luminance)} / lum), vec3(${f(INK.r)}, ${f(INK.g)}, ${f(INK.b)}), ${f(TITLE_FACE.ink)});
    return deep * mix(${f(TITLE_FACE.shade[0])}, ${f(TITLE_FACE.shade[1])}, y);
  }
  vec3 titleFaceNight(vec3 glow, float y){
    float lum = max(dot(glow, vec3(0.2126, 0.7152, 0.0722)), 0.001);
    vec3 lit = min(glow * (${f(TITLE_FACE_NIGHT.luminance)} / lum), vec3(1.0));
    vec3 face = mix(lit, vec3(${f(CREAM.r)}, ${f(CREAM.g)}, ${f(CREAM.b)}), ${f(TITLE_FACE_NIGHT.cream)});
    return face * mix(${f(TITLE_FACE_NIGHT.shade[0])}, ${f(TITLE_FACE_NIGHT.shade[1])}, y);
  }`;
