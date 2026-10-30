import { readFileSync } from "node:fs";
import path from "node:path";

import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  EXPOSURE,
  STUDIO,
  studioBackground,
  UNTONEMAP_GLSL,
  untonemapped,
} from "@/components/three/engine/studio";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");
const css = read("src/app/globals.css");
const rootStart = css.indexOf(":root {");
const root = css.slice(rootStart, css.indexOf("}", rootStart));

function token(name: string) {
  const match = root.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match?.[1]) throw new Error(`--${name} is missing`);
  return match[1].trim();
}

type Rgba = readonly [number, number, number, number];

function parse(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = /^rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)$/.exec(value);
  if (rgb) return [+rgb[1]!, +rgb[2]!, +rgb[3]!, +rgb[4]! / 100];
  throw new Error(`unsupported color ${value}`);
}

const color = (name: string) => parse(token(name));

/** A translucent color painted over an opaque one. */
function over(top: Rgba, base: Rgba): Rgba {
  const a = top[3];
  return [
    top[0] * a + base[0] * (1 - a),
    top[1] * a + base[1] * (1 - a),
    top[2] * a + base[2] * (1 - a),
    1,
  ];
}

function luminance([r, g, b]: Rgba) {
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: Rgba, b: Rgba) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

// three.js's ACES filmic tone mapping (tonemapping_pars_fragment), forward
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
const fit = (v: number) =>
  (v * (v + 0.0245786) - 0.000090537) /
  (v * (0.983729 * v + 0.432951) + 0.238081);

function toneMapped(c: THREE.Color) {
  const v = new THREE.Vector3(c.r, c.g, c.b)
    .multiplyScalar(EXPOSURE / 0.6)
    .applyMatrix3(ACES_IN);
  v.set(fit(v.x), fit(v.y), fit(v.z)).applyMatrix3(ACES_OUT).clampScalar(0, 1);
  return new THREE.Color().setRGB(v.x, v.y, v.z, THREE.LinearSRGBColorSpace);
}

describe("Daylight Glass theme (TC-P4-199 – TC-P4-203)", () => {
  it("TC-P4-199 — a backdrop color sent through tone mapping comes out as designed", () => {
    for (const hex of [STUDIO.canvas, "#ecdfcb", "#e3ece2", "#d8e6dc"]) {
      const shown = toneMapped(untonemapped(hex));
      const target = new THREE.Color(hex);
      expect(shown.r).toBeCloseTo(target.r, 6);
      expect(shown.g).toBeCloseTo(target.g, 6);
      expect(shown.b).toBeCloseTo(target.b, 6);
    }
    // the shader copy is the same inverse, with real numbers in it
    expect(UNTONEMAP_GLSL).toContain("vec3 untonemap(vec3 c)");
    expect(UNTONEMAP_GLSL).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("TC-P4-200 — the scene background is the plain cream without post effects and its tone mapping source with them", () => {
    expect(studioBackground(false).getHexString()).toBe("f6eee1");
    const withPost = studioBackground(true);
    // brighter than white before tone mapping brings it back down
    expect(withPost.r).toBeGreaterThan(1);
    expect(toneMapped(withPost).getHexString()).toBe("f6eee1");
  });

  it("TC-P4-201 — the 3D studio, the page canvas and the browser theme color are the same cream", () => {
    expect(token("surface-canvas")).toBe(STUDIO.canvas);
    expect(read("src/app/layout.tsx")).toContain(
      `themeColor: "${STUDIO.canvas}"`,
    );
    expect(root).toContain("color-scheme: light;");
  });

  it("TC-P4-202 — text keeps WCAG AA contrast on every panel, under the brightest window light too", () => {
    const canvas = color("surface-canvas");
    const lit = ["wash-green", "wash-peach", "wash-sage"].map((wash) =>
      over(color(wash), canvas),
    );
    const panels = [
      canvas,
      ...lit,
      color("surface-warm"),
      color("surface-accent"),
      color("surface-overlay"),
      over(color("accent-soft"), canvas),
      ...[canvas, ...lit].flatMap((base) =>
        ["surface-card", "surface-raised", "surface-input"].map((panel) =>
          over(color(panel), base),
        ),
      ),
    ];
    for (const text of [
      "text-strong",
      "text-muted",
      "text-subtle",
      "accent-solid",
      "accent-strong",
      "danger",
    ]) {
      for (const panel of panels) {
        expect(contrast(color(text), panel), text).toBeGreaterThanOrEqual(4.5);
      }
    }
    const notice = over(color("notice-surface"), canvas);
    expect(contrast(color("notice-text"), notice)).toBeGreaterThanOrEqual(4.5);
    // error boxes sit on the page and inside the order dialog
    for (const base of [canvas, color("surface-overlay")]) {
      expect(
        contrast(color("danger"), over(color("danger-soft"), base)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("TC-P4-203 — filled buttons, the footer and photo captions keep their text readable", () => {
    for (const fill of [
      "accent-solid",
      "accent-solid-hover",
      "accent-strong",
    ]) {
      expect(
        contrast(color("on-accent"), color(fill)),
        fill,
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const text of ["footer-text", "footer-muted"]) {
      expect(
        contrast(color(text), color("footer-surface")),
        text,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // the caption scrim over the brightest photo there could be
    const caption = over(color("photo-scrim"), [255, 255, 255, 1]);
    expect(contrast(color("on-photo"), caption)).toBeGreaterThanOrEqual(4.5);
  });
});
