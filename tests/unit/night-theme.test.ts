import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";

import { DRINKS_GLOW } from "@/components/menu/category-glow";
import {
  EXPOSURE,
  followTheme,
  STUDIO,
  studioBackground,
  studioCanvas,
  TITLE_FACE_GLSL,
  TITLE_FACE_NIGHT,
  titleFaceNight,
  untonemapped,
  WALL_WASH,
  WALL_WASH_GLSL,
} from "@/components/three/engine/studio";
import { showcaseItems } from "@/components/three/showcase-data";
import { THEME_COLOR, THEME_EVENT, type Theme } from "@/lib/theme/theme";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");
const css = read("src/app/globals.css");

/** A token block from globals.css: `:root` is day, the attribute one night. */
function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`${selector} is missing`);
  return css.slice(start, css.indexOf("}", start));
}

const blocks = {
  day: block(":root"),
  night: block(':root[data-theme="night"]'),
};

const declarations = (text: string) =>
  new Map(
    [...text.matchAll(/(?:^|[\s;{])--([a-z0-9-]+):\s*([^;]+);/g)].map(
      (m) => [m[1]!, m[2]!.trim()] as const,
    ),
  );

const tokens = {
  day: declarations(blocks.day),
  night: declarations(blocks.night),
};

/** A token's value in a theme, following `var(--other)` the way CSS does. */
function token(theme: Theme, name: string): string {
  const value =
    (theme === "night" ? tokens.night.get(name) : undefined) ??
    tokens.day.get(name);
  if (!value) throw new Error(`--${name} is missing`);
  const alias = /^var\(--([a-z0-9-]+)\)$/.exec(value);
  return alias?.[1] ? token(theme, alias[1]) : value;
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

/** A linear color as the screen shows it, for the contrast helpers. */
const onScreen = (c: THREE.Color): Rgba => {
  const srgb = c.clone().convertLinearToSRGB();
  return [srgb.r * 255, srgb.g * 255, srgb.b * 255, 1];
};

const ALL_TEXT = [
  "text-strong",
  "text-muted",
  "text-subtle",
  "accent-solid",
  "accent-strong",
  "danger",
];

/**
 * Every surface text sits on in a theme (with the light washes behind), and
 * the text colors that surface carries.
 */
function surfaces(theme: Theme) {
  const c = (name: string) => parse(token(theme, name));
  const canvas = c("surface-canvas");
  const washes = ["wash-green", "wash-peach", "wash-sage"];
  const pages: [string, Rgba][] = [
    ["page", canvas],
    ...washes.map((wash): [string, Rgba] => [
      `page lit by ${wash}`,
      over(c(wash), canvas),
    ]),
  ];
  const on = (fill: string, label = fill) =>
    pages.map(([name, base]): [string, Rgba] => [
      `${label} on ${name}`,
      over(c(fill), base),
    ]);
  const cards = on("surface-card", "card");
  const sheet = c("surface-overlay");
  const segmented = over(c("glass-fill"), canvas);
  return [
    // pages, cards, grouped rows, the dialog and drawer, and older panels
    {
      texts: ALL_TEXT,
      panels: [
        ...pages,
        ...cards,
        ...cards.map(([name, base]): [string, Rgba] => [
          `grouped rows in ${name}`,
          over(c("fill-tertiary"), base),
        ]),
        ["dialog or drawer", sheet] as [string, Rgba],
        ["grouped rows in a dialog", over(c("fill-tertiary"), sheet)] as [
          string,
          Rgba,
        ],
        ["warm panel", c("surface-warm")] as [string, Rgba],
        ["accent panel", c("surface-accent")] as [string, Rgba],
        ["accent tint", over(c("accent-soft"), canvas)] as [string, Rgba],
        ...on("surface-raised"),
        ...on("surface-input"),
      ],
    },
    // the header, category and cart bars, glass buttons and the toast
    {
      texts: ["text-strong", "text-muted", "accent-solid", "danger"],
      panels: [
        ...on("header-fill-scrolled", "header"),
        ...on("bar-fill", "bar"),
        ...on("glass-fill-strong", "glass button"),
      ],
    },
    // chips (category tabs, flavors) and the showcase switcher
    {
      texts: ["text-strong", "text-muted"],
      panels: [
        ...on("fill-secondary", "chip"),
        ["switcher", segmented] as [string, Rgba],
      ],
    },
    {
      texts: ["text-strong"],
      panels: [
        [
          "chosen switcher segment",
          theme === "night"
            ? over(c("fill-primary"), segmented)
            : c("surface-overlay"),
        ] as [string, Rgba],
      ],
    },
  ];
}

const THEMES: Theme[] = ["day", "night"];

describe("Night theme and iOS surfaces (TC-P4-228 – TC-P4-232, TC-P4-237)", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it("TC-P4-228 — text keeps WCAG AA contrast on every iOS surface, by day and at night", () => {
    const failures: string[] = [];
    for (const theme of THEMES) {
      const c = (name: string) => parse(token(theme, name));
      for (const { texts, panels } of surfaces(theme)) {
        for (const text of texts) {
          for (const [name, panel] of panels) {
            const ratio = contrast(c(text), panel);
            if (ratio < 4.5)
              failures.push(`${theme}: ${text} on ${name} ${ratio.toFixed(2)}`);
          }
        }
      }
      const canvas = c("surface-canvas");
      const notice = contrast(
        c("notice-text"),
        over(c("notice-surface"), canvas),
      );
      if (notice < 4.5) failures.push(`${theme}: notice ${notice.toFixed(2)}`);
      for (const base of [canvas, c("surface-overlay")]) {
        const error = contrast(c("danger"), over(c("danger-soft"), base));
        if (error < 4.5)
          failures.push(`${theme}: error box ${error.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("TC-P4-229 — white text stays readable on filled buttons, the footer and photo captions in both themes", () => {
    for (const theme of THEMES) {
      const c = (name: string) => parse(token(theme, name));
      for (const fill of [
        "accent-fill",
        "accent-fill-hover",
        "accent-strong-fill",
      ]) {
        const base = c(fill);
        expect(
          contrast(c("on-accent"), base),
          `${theme}: ${fill}`,
        ).toBeGreaterThanOrEqual(4.5);
        // a selected chip or segment sits on the same fill
        expect(
          contrast(c("on-accent"), over([255, 255, 255, 0.07], base)),
          `${theme}: ${fill} under the button's top sheen`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const text of ["footer-text", "footer-muted", "footer-strong"]) {
        expect(
          contrast(c(text), c("footer-surface")),
          `${theme}: ${text}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      const caption = over(c("photo-scrim"), [255, 255, 255, 1]);
      expect(contrast(c("on-photo"), caption), theme).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("TC-P4-230 — night overrides every day color, and filled controls use the fill tokens", () => {
    expect(blocks.night).toContain("color-scheme: dark;");
    const colors = [...tokens.day].filter(([, value]) =>
      /^(#|rgb|var\(--)/.test(value),
    );
    expect(colors.length).toBeGreaterThan(40);
    for (const [name] of colors) {
      expect(tokens.night.has(name), `--${name} at night`).toBe(true);
    }
    // --accent-solid is for text, links and rings; a fill under white text
    // uses --accent-fill, which is deeper at night
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const entry of readdirSync(path.join(process.cwd(), dir), {
        withFileTypes: true,
      })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(file);
        else if (/\.(tsx?|css)$/.test(entry.name)) {
          const source = read(file);
          if (
            /bg-\[var\(--accent-solid|background(-color)?:\s*var\(--accent-solid/.test(
              source,
            )
          )
            offenders.push(file);
        }
      }
    };
    scan("src");
    expect(offenders).toEqual([]);
  });

  it("TC-P4-231 — the 3D studio, the page and the browser bar share each theme's canvas color", () => {
    expect(token("day", "surface-canvas")).toBe(THEME_COLOR.day);
    expect(token("night", "surface-canvas")).toBe(THEME_COLOR.night);
    expect(STUDIO.canvas).toBe(THEME_COLOR.day);
    expect(STUDIO.night).toBe(THEME_COLOR.night);
    expect(studioCanvas("day")).toBe(STUDIO.canvas);
    expect(studioCanvas("night")).toBe(STUDIO.night);
    expect(studioBackground(false, "night").getHexString()).toBe("14120f");
    expect(toneMapped(studioBackground(true, "night")).getHexString()).toBe(
      "14120f",
    );
  });

  it("TC-P4-232 — every product name on a 3D wall reads at night, on the wall and on its glow", () => {
    const glows = [
      ...showcaseItems.map((item) => item.glow),
      `#${new THREE.Color(DRINKS_GLOW.a).lerp(new THREE.Color(DRINKS_GLOW.b), 0.35).getHexString()}`,
      `#${new THREE.Color(DRINKS_GLOW.a).lerp(new THREE.Color(DRINKS_GLOW.b), 0.5).getHexString()}`,
    ];
    const wall = new THREE.Color(STUDIO.night);
    for (const glow of glows) {
      const washed = wall.clone().lerp(new THREE.Color(glow), WALL_WASH.night);
      for (const y of [0, 0.5, 1]) {
        const face = titleFaceNight(glow, y);
        const shown = toneMapped(untonemapped(face));
        expect(shown.r).toBeCloseTo(face.r, 4);
        expect(
          contrast(onScreen(face), onScreen(wall)),
          `${glow} at ${y}`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(onScreen(face), onScreen(washed)),
          `${glow} at ${y} on its glow`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
    expect(WALL_WASH.night).toBeLessThan(WALL_WASH.day);
    expect(TITLE_FACE_NIGHT.shade[1]).toBeGreaterThan(
      TITLE_FACE_NIGHT.shade[0],
    );
    expect(TITLE_FACE_GLSL).toContain(
      "vec3 titleFaceNight(vec3 glow, float y)",
    );
    expect(WALL_WASH_GLSL).toContain("float wallWash(float night)");
    for (const glsl of [TITLE_FACE_GLSL, WALL_WASH_GLSL]) {
      expect(glsl).not.toMatch(/NaN|Infinity|undefined/);
    }
    const showcase = read("src/components/three/scenes/showcase.ts");
    expect(showcase).toContain("titleFaceNight(uGlow,");
    expect(showcase).toContain("wallWash(uNight)");
    expect(read("src/components/three/scenes/ambient.ts")).toContain(
      "wallWash(uNight)",
    );
  });

  it("TC-P4-237 — a 3D scene recolors when the theme changes, and stops when it is disposed", () => {
    document.documentElement.dataset.theme = "night";
    const seen: Theme[] = [];
    const stop = followTheme((theme) => seen.push(theme));
    expect(seen).toEqual(["night"]);
    document.documentElement.dataset.theme = "day";
    window.dispatchEvent(new CustomEvent(THEME_EVENT));
    expect(seen).toEqual(["night", "day"]);
    stop();
    document.documentElement.dataset.theme = "night";
    window.dispatchEvent(new CustomEvent(THEME_EVENT));
    expect(seen).toEqual(["night", "day"]);
  });
});
