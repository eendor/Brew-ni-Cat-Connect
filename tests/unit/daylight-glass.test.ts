import { readFileSync } from "node:fs";
import path from "node:path";

import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  EXPOSURE,
  STUDIO,
  studioBackground,
  TITLE_FACE,
  TITLE_FACE_GLSL,
  titleFace,
  TONE_MAPPING,
  UNTONEMAP_GLSL,
  untonemapped,
} from "@/components/three/engine/studio";
import {
  PRINT_FRAGMENT,
  ringFocus,
  SIDE_PRINT,
} from "@/components/three/scenes/gallery-ring";
import { DRINKS_GLOW } from "@/components/menu/category-glow";
import { showcaseItems } from "@/components/three/showcase-data";

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

// three.js's Neutral tone mapping (tonemapping_pars_fragment), forward
function toneMapped(c: THREE.Color) {
  let v = [c.r, c.g, c.b].map((n) => n * EXPOSURE);
  const x = Math.min(...v);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  v = v.map((n) => n - offset);
  const peak = Math.max(...v);
  if (peak >= 0.76) {
    const d = 1 - 0.76;
    const newPeak = 1 - (d * d) / (peak + d - 0.76);
    const g = 1 - 1 / (0.15 * (peak - newPeak) + 1);
    v = v.map((n) => ((n * newPeak) / peak) * (1 - g) + newPeak * g);
  }
  const [r = 0, gr = 0, b = 0] = v.map((n) => Math.min(Math.max(n, 0), 1));
  return new THREE.Color().setRGB(r, gr, b, THREE.LinearSRGBColorSpace);
}

describe("Daylight Glass theme (TC-P4-199 – TC-P4-203)", () => {
  it("TC-P4-199 — a backdrop color sent through tone mapping comes out as designed", () => {
    for (const hex of [
      STUDIO.canvas,
      "#ecdfcb",
      "#e3ece2",
      "#d8e6dc",
      "#3f7a3a",
      "#1d2a21",
    ]) {
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
    for (const text of ["footer-text", "footer-muted", "footer-strong"]) {
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

/** A linear color as the screen shows it, for the contrast helpers. */
const onScreen = (c: THREE.Color): Rgba => {
  const srgb = c.clone().convertLinearToSRGB();
  return [srgb.r * 255, srgb.g * 255, srgb.b * 255, 1];
};

describe("Washed-out colors fix (TC-P4-223 – TC-P4-227)", () => {
  it("TC-P4-223 — the footer only uses its own light colors on its deep green", () => {
    const footer = read("src/components/layout/site-footer.tsx");
    // the page's dark text colors are dark on dark here
    expect(footer).not.toMatch(/--text-(strong|muted|subtle)/);
    expect(footer).toContain("var(--footer-strong)");
    const heading = css.slice(css.indexOf(".footer-heading {"));
    expect(heading.slice(0, heading.indexOf("}"))).toContain(
      "color: var(--footer-strong)",
    );
    expect(
      contrast(color("footer-strong"), color("footer-surface")),
    ).toBeGreaterThanOrEqual(7);
  });

  it("TC-P4-224 — the 3D scenes use Neutral tone mapping, which keeps product colors", () => {
    expect(TONE_MAPPING).toBe(THREE.NeutralToneMapping);
    expect(read("src/components/three/engine/renderer.ts")).toContain(
      "renderer.toneMapping = TONE_MAPPING;",
    );
    // a lit leaf green keeps its hue and most of its saturation, where ACES
    // filmic pushed it toward a pale grey-green
    const leaf = new THREE.Color("#4f8a3c");
    const shown = toneMapped(leaf);
    const hsl = { before: { h: 0, s: 0, l: 0 }, after: { h: 0, s: 0, l: 0 } };
    leaf.getHSL(hsl.before);
    shown.getHSL(hsl.after);
    expect(Math.abs(hsl.after.h - hsl.before.h)).toBeLessThan(0.02);
    expect(hsl.after.s).toBeGreaterThan(hsl.before.s * 0.9);
  });

  it("TC-P4-225 — the gallery's front photo keeps its own colors, and side photos stay visible", () => {
    const seg = (Math.PI * 2) / 8;
    expect(ringFocus(0, 0, seg)).toBe(1);
    expect(ringFocus(1, 0, seg)).toBeLessThan(0.1);
    expect(ringFocus(1, seg, seg)).toBe(1);
    // the scroll turn isn't part of the focus, so scrolling can't fade it
    expect(read("src/components/three/scenes/gallery-ring.ts")).toContain(
      "ringFocus(i, st.rot, seg)",
    );
    // no light is added on top of the photo
    expect(PRINT_FRAGMENT).not.toMatch(/col\s*\+=/);
    expect(PRINT_FRAGMENT).not.toMatch(/NaN|undefined/);
    // a side photo keeps most of its color
    expect(SIDE_PRINT.color).toBeGreaterThanOrEqual(0.5);
    expect(SIDE_PRINT.saturation).toBeGreaterThanOrEqual(0.5);
  });

  it("TC-P4-226 — every product name on a 3D wall reads on the cream at 4.5:1 or better", () => {
    const glows = [
      ...showcaseItems.map((item) => item.glow),
      // the menu hero and the empty-cart and not-found scenes
      `#${new THREE.Color(DRINKS_GLOW.a).lerp(new THREE.Color(DRINKS_GLOW.b), 0.35).getHexString()}`,
      `#${new THREE.Color(DRINKS_GLOW.a).lerp(new THREE.Color(DRINKS_GLOW.b), 0.5).getHexString()}`,
    ];
    const cream = onScreen(new THREE.Color(STUDIO.canvas));
    for (const glow of glows) {
      for (const y of [0, 0.5, 1]) {
        const face = titleFace(glow, y);
        // the wall goes through tone mapping and back unchanged
        const shown = toneMapped(untonemapped(face));
        expect(shown.r).toBeCloseTo(face.r, 4);
        expect(
          contrast(onScreen(face), cream),
          `${glow} at ${y}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(TITLE_FACE.shade[1]).toBeGreaterThan(TITLE_FACE.shade[0]);
    expect(TITLE_FACE_GLSL).toContain("vec3 titleFace(vec3 glow, float y)");
    expect(TITLE_FACE_GLSL).not.toMatch(/NaN|Infinity|undefined/);
    expect(read("src/components/three/scenes/showcase.ts")).toContain(
      "titleFace(uGlow,",
    );
  });

  it("TC-P4-227 — loose ice is tinted cool, not near-white, on desktop and on phones", () => {
    const models = read("src/components/three/scenes/models.ts");
    const ice = models.slice(models.indexOf("name: FLOATING_ICE"));
    const base = /color: "(#[0-9a-f]{6})"/.exec(ice)?.[1] ?? "#ffffff";
    const tint = new THREE.Color(base);
    const hsl = { h: 0, s: 0, l: 0 };
    tint.getHSL(hsl);
    // a cool blue, darker than the cream wall it refracts
    expect(hsl.h).toBeGreaterThan(0.5);
    expect(hsl.h).toBeLessThan(0.6);
    expect(luminance(parse(base))).toBeLessThan(
      luminance(parse(STUDIO.canvas)),
    );
    // the phone tier draws it see-through instead of as an additive gloss
    expect(models).toMatch(
      /physical\.name === FLOATING_ICE\)[\s\S]{0,200}physical\.opacity/,
    );
  });
});
