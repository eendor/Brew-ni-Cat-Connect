import { existsSync, readFileSync } from "node:fs";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatParade } from "@/components/cats/cat-parade";
import { CatSoundsToggle } from "@/components/cats/cat-sounds-toggle";
import {
  setCurtainCovering,
  setCurtainSettled,
} from "@/components/motion/curtain-state";
import {
  festiveSeason,
  KITTEN_COATS,
  PARADE_ORDER,
  paradeLap,
  paradeSize,
  paradeSpeed,
  paradeWalkers,
  restMs,
  SHOP_CATS,
  SLEIGH_RIDER,
  stripHeight,
  walkMs,
} from "@/lib/cats/cats";
import {
  CAT_FRAME,
  CAT_TAGS,
  catRow,
  catSheet,
  pixelScale,
  SLEIGH_FRAME,
  SLEIGH_FRAMES,
  SLEIGH_SHEET,
  sleighFrame,
  spriteSpan,
  WALK_FRAME_MS,
  WALK_FRAMES,
  walkFrame,
} from "@/lib/cats/sprites";
import {
  CAT_SOUNDS_KEY,
  catSoundsOn,
  meow,
  meowShape,
  setCatSounds,
} from "@/lib/sound/cat-sounds";

vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  vi.stubGlobal("innerWidth", 1440);
  vi.stubGlobal("innerHeight", 900);
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setCurtainSettled();
});

describe("cat characters (FR-099)", () => {
  // Update 2026-11-13 (ADR-032): 3D cats modelled in three.js after the
  // shop's own cats replace the pixel cats. They walk in single file across
  // the top of the footer, like reindeer, pulling a coffee-cup sleigh.
  it("TC-P9-001 seven of the shop's cats; Luna rides; the sleigh is seasonal; the parade's size follows the screen", () => {
    expect(SHOP_CATS.map((c) => c.id)).toEqual([
      "kasper",
      "latte",
      "luna",
      "kulas",
      "oreo",
      "grey",
      "kasper-nap",
    ]);
    // each has its own coat and eyes (Kasper's are two colours)
    const kasper = SHOP_CATS.find((c) => c.id === "kasper")!;
    expect(kasper.look.eyeLeft).not.toBe(kasper.look.eyeRight);
    expect(new Set(SHOP_CATS.map((c) => c.look.coat)).size).toBe(7);
    // Oreo leads; Luna, a mama cat soon, never walks: she rides with her kittens
    expect(PARADE_ORDER[0]).toBe("oreo");
    expect(PARADE_ORDER).not.toContain(SLEIGH_RIDER);
    expect(SLEIGH_RIDER).toBe("luna");
    expect(KITTEN_COATS).toHaveLength(3);
    for (const id of KITTEN_COATS)
      expect(SHOP_CATS.map((c) => c.id)).toContain(id);
    // the sleigh is for November and December only
    expect(festiveSeason(new Date(2026, 10, 13))).toBe(true);
    expect(festiveSeason(new Date(2026, 11, 31, 23, 59))).toBe(true);
    expect(festiveSeason(new Date(2027, 0, 1))).toBe(false);
    expect(festiveSeason(new Date(2027, 5, 1))).toBe(false);
    // more cats and a taller strip on wider screens, within limits
    expect(paradeSize(390)).toBe(3);
    expect(paradeSize(800)).toBe(4);
    expect(paradeSize(1440)).toBe(4);
    expect(paradeWalkers(390).map((c) => c.id)).toEqual([
      "oreo",
      "latte",
      "kulas",
    ]);
    expect(stripHeight(390)).toBe(84);
    expect(stripHeight(1440)).toBe(108);
    expect(stripHeight(3840)).toBe(150);
  });

  it("TC-P9-002 the strip is hidden from screen readers and holds a canvas, not pictures", () => {
    mockReducedMotion(true);
    render(<CatParade />);
    const strip = screen.getByTestId("cat-parade");
    expect(strip).toHaveAttribute("aria-hidden", "true");
    expect(strip.querySelectorAll("img")).toHaveLength(0);
    expect(strip.querySelector("canvas")).not.toBeNull();
    // without a 2D canvas (as here) it never says it is ready, so CSS keeps it hidden
    expect(strip.dataset.ready).toBeUndefined();
    expect(strip.dataset.walking).toBe("false");
  });

  it("TC-P9-003 each lap starts and ends with the parade out of sight and passes the middle without stopping", () => {
    for (const [width, span] of [
      [390, 360],
      [1440, 620],
    ] as const) {
      const right = paradeLap(width, span, 1);
      // walking right, the lead's nose starts at the left edge with everyone behind it
      expect(right.start - span).toBeLessThanOrEqual(0);
      expect(right.end - span).toBeGreaterThanOrEqual(width);
      // mid-lap (where they glance out, still walking) the parade is centred
      expect(right.stop - span).toBeCloseTo(width - right.stop);
      const left = paradeLap(width, span, -1);
      expect(left.start).toBeGreaterThanOrEqual(width);
      expect(left.end + span).toBeLessThanOrEqual(0);
      expect(left.stop).toBeCloseTo(width - (left.stop + span));
    }
  });

  it("TC-P9-004 they walk about a body length a second and rest between laps", () => {
    expect(paradeSpeed(100)).toBe(95);
    expect(walkMs(950, 100)).toBe(10_000);
    expect(walkMs(-950, 100)).toBe(10_000);
    expect(restMs(0)).toBe(5_000);
    expect(restMs(1)).toBe(12_000);
    expect(restMs(7)).toBe(12_000);
  });

  it("TC-P9-016 each walker and the sleigh are Aseprite sprites, with editable sources and one tag a row", () => {
    const size = (file: string) => {
      const png = readFileSync(file);
      // the PNG signature, then the IHDR width and height
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      return [png.readUInt32BE(16), png.readUInt32BE(20)];
    };
    for (const id of PARADE_ORDER) {
      expect(existsSync(`art/cats/${id}.aseprite`)).toBe(true);
      expect(size(`public${catSheet(id)}`)).toEqual([
        CAT_FRAME.width * WALK_FRAMES,
        CAT_FRAME.height * CAT_TAGS.length,
      ]);
      const data = JSON.parse(readFileSync(`art/cats/${id}.json`, "utf8")) as {
        frames: { duration: number }[];
        meta: { frameTags: { name: string; from: number; to: number }[] };
      };
      // the tags are the sheet's rows, in order, a step cycle each
      expect(data.meta.frameTags.map((t) => t.name)).toEqual([...CAT_TAGS]);
      data.meta.frameTags.forEach((tag, row) => {
        expect(tag.from).toBe(row * WALK_FRAMES);
        expect(tag.to - tag.from + 1).toBe(WALK_FRAMES);
      });
      expect(data.frames.every((f) => f.duration === WALK_FRAME_MS)).toBe(true);
    }
    expect(existsSync("art/cats/sleigh.aseprite")).toBe(true);
    expect(size(`public${SLEIGH_SHEET}`)).toEqual([
      SLEIGH_FRAME.width * SLEIGH_FRAMES,
      SLEIGH_FRAME.height,
    ]);
    // no photo cut-outs or 3D models are shipped
    expect(existsSync("src/components/cats/cat-model.ts")).toBe(false);
  });

  it("TC-P9-017 the cats look ahead, glance out past halfway, open their mouths to meow, and wear bells in the holidays", () => {
    expect(CAT_TAGS[catRow(0, false, false)]).toBe("walk");
    expect(CAT_TAGS[catRow(0.3, false, false)]).toBe("walk");
    expect(CAT_TAGS[catRow(0.8, false, false)]).toBe("look");
    expect(CAT_TAGS[catRow(0, true, false)]).toBe("meow");
    expect(CAT_TAGS[catRow(0, false, true)]).toBe("walk-festive");
    expect(CAT_TAGS[catRow(1, false, true)]).toBe("look-festive");
    expect(CAT_TAGS[catRow(1, true, true)]).toBe("meow-festive");
  });

  it("TC-P9-013 a walking cat steps through its cycle, out of step with the next; standing still, it stays put", () => {
    const frames = (stride: number, index: number) =>
      Array.from({ length: 12 }, (_, i) =>
        walkFrame((i * WALK_FRAME_MS) / 1000, stride, index),
      );
    expect(new Set(frames(1, 0)).size).toBe(WALK_FRAMES);
    expect(frames(1, 0)).not.toEqual(frames(1, 1));
    expect(new Set(frames(0, 0))).toEqual(new Set([0]));
    expect(sleighFrame(0.5, false)).toBe(0);
    expect(
      new Set(Array.from({ length: 8 }, (_, i) => sleighFrame(i * 0.18, true)))
        .size,
    ).toBe(SLEIGH_FRAMES);
  });

  it("TC-P9-021 the sprites stay crisp and the whole parade fits the strip and the screen", () => {
    for (const [width, height, dpr] of [
      [390, 84, 3],
      [1440, 108, 1],
      [1440, 108, 2],
      [1920, 144, 1],
      [3840, 150, 2],
    ] as const) {
      for (const festive of [true, false]) {
        const cats = paradeWalkers(width).length;
        const px = pixelScale(width, height, dpr, cats, festive);
        // a whole number of device pixels a sprite pixel
        expect(Number.isInteger(px)).toBe(true);
        expect(px).toBeGreaterThanOrEqual(1);
        // ears to the ground fit the strip, and the parade the screen
        expect((42 * px) / dpr).toBeLessThanOrEqual(height);
        expect((spriteSpan(cats, festive) * px) / dpr).toBeLessThanOrEqual(
          width,
        );
      }
    }
    // the cats stand most of the strip on a desktop
    expect((40 * pixelScale(1440, 108, 1, 4, true)) / 1).toBeGreaterThanOrEqual(
      80,
    );
  });

  it("TC-P9-014 the footer's strip is part of the page, so it never covers anything", async () => {
    const css = (await import("node:fs")).readFileSync(
      "src/app/globals.css",
      "utf8",
    );
    const rule = css.slice(
      css.indexOf(".cat-parade {"),
      css.indexOf("}", css.indexOf(".cat-parade {")),
    );
    expect(rule).toContain("position: relative");
    expect(rule).toContain("pointer-events: none");
    expect(rule).not.toContain("fixed");
    // the paw cursor, with a pointing paw on things you can press
    expect(css).toContain('url("/cursors/paw.svg")');
    expect(css).toContain('url("/cursors/paw-pointer.svg")');
  });

  it("TC-P9-015 page transitions meow, and the footer switch turns it off on this device", () => {
    const started: number[] = [];
    const param = () => ({
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    });
    const node = () => ({
      type: "",
      frequency: param(),
      gain: param(),
      Q: param(),
      connect: (next: unknown) => next,
      start: (t: number) => started.push(t),
      stop: vi.fn(),
    });
    class FakeContext {
      state = "running";
      currentTime = 0;
      destination = {};
      resume = vi.fn();
      createOscillator = node;
      createBiquadFilter = node;
      createGain = node;
    }
    vi.stubGlobal("AudioContext", FakeContext);
    mockReducedMotion(true);
    render(
      <>
        <CatParade />
        <CatSoundsToggle />
      </>,
    );
    expect(catSoundsOn()).toBe(true);
    act(() => setCurtainCovering(true));
    expect(started).toHaveLength(1);

    const toggle = screen.getByRole("switch", { name: /cat sounds/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem(CAT_SOUNDS_KEY)).toBe("off");
    act(() => setCurtainCovering(true));
    expect(started).toHaveLength(1);
    expect(meow()).toBe(false);

    // switching it back on plays one meow so the visitor hears it
    fireEvent.click(toggle);
    expect(started).toHaveLength(2);
    setCatSounds(true);

    // a short meow that rises, then falls back
    for (const r of [0, 0.5, 1]) {
      const shape = meowShape(r);
      expect(shape.peak).toBeGreaterThan(shape.start);
      expect(shape.end).toBeLessThan(shape.peak);
      expect(shape.ms).toBeLessThanOrEqual(480);
    }
  });
});
