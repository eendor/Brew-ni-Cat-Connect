import { act, fireEvent, render, screen } from "@testing-library/react";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildCat } from "@/components/cats/cat-model";

import { CatParade } from "@/components/cats/cat-parade";
import { CatSoundsToggle } from "@/components/cats/cat-sounds-toggle";
import {
  setCurtainCovering,
  setCurtainSettled,
} from "@/components/motion/curtain-state";
import {
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
  it("TC-P9-001 seven of the shop's cats; the parade's size follows the screen", () => {
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
    // Oreo leads; Kasper rides in the sleigh, asleep
    expect(PARADE_ORDER[0]).toBe("oreo");
    expect(PARADE_ORDER).not.toContain(SLEIGH_RIDER);
    expect(SHOP_CATS.find((c) => c.id === SLEIGH_RIDER)!.pose).toBe("lie");
    // more cats and a taller strip on wider screens, within limits
    expect(paradeSize(390)).toBe(3);
    expect(paradeSize(800)).toBe(4);
    expect(paradeSize(1440)).toBe(5);
    expect(paradeWalkers(390).map((c) => c.id)).toEqual([
      "oreo",
      "latte",
      "luna",
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
    // without WebGL2 (as here) it never says it is ready, so CSS keeps it hidden
    expect(strip.dataset.ready).toBeUndefined();
    expect(strip.dataset.walking).toBe("false");
  });

  it("TC-P9-003 each lap starts and ends with the parade out of sight and stops in the middle", () => {
    for (const [width, span] of [
      [390, 360],
      [1440, 620],
    ] as const) {
      const right = paradeLap(width, span, 1);
      // walking right, the lead's nose starts at the left edge with everyone behind it
      expect(right.start - span).toBeLessThanOrEqual(0);
      expect(right.end - span).toBeGreaterThanOrEqual(width);
      // at the stop the whole parade is on screen, centred
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

  it("TC-P9-016 each cat is built from three.js geometry, with no pictures, and comes alive", () => {
    for (const [index, cat] of SHOP_CATS.entries()) {
      const model = buildCat(cat.look, cat.pose, index + 1);
      const meshes: THREE.Mesh[] = [];
      model.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });
      expect(meshes.length).toBeGreaterThan(20);
      for (const m of meshes) {
        const material = m.material as THREE.MeshStandardMaterial;
        expect(material.map ?? null).toBeNull();
      }
      // its coat colour is on the model
      const colours = new Set(
        meshes.map((m) =>
          (m.material as THREE.MeshStandardMaterial).color.getHexString(),
        ),
      );
      expect(colours).toContain(cat.look.coat.slice(1));
      expect(colours).toContain(cat.look.eyeLeft.slice(1));
      // a name tag only where the real cat wears one
      expect(colours.has(cat.look.tag?.slice(1) ?? "-")).toBe(
        Boolean(cat.look.tag),
      );

      // a sitting cat is taller than wide; the napping cat is wider than tall
      model.update(0, 0, { x: 0, y: 0 });
      const size = new THREE.Box3()
        .setFromObject(model.root)
        .getSize(new THREE.Vector3());
      if (cat.pose !== "lie") expect(size.y).toBeGreaterThan(size.x);
      else expect(size.x).toBeGreaterThan(size.y);

      // over time it moves: breathing and the tail change the shape
      const before = JSON.stringify(
        meshes.map((m) => m.getWorldPosition(new THREE.Vector3()).toArray()),
      );
      model.update(0.5, 1.3, { x: 0.8, y: 0 });
      const after = JSON.stringify(
        meshes.map((m) => m.getWorldPosition(new THREE.Vector3()).toArray()),
      );
      expect(after).not.toBe(before);
      model.dispose();
    }
    // the walking cat stands on four legs and is longer than it is wide
    const walker = buildCat(SHOP_CATS[4]!.look, "walk", 9);
    walker.update(0, 0, { x: 0, y: 0 }, 0);
    const size = new THREE.Box3()
      .setFromObject(walker.root)
      .getSize(new THREE.Vector3());
    expect(size.z).toBeGreaterThan(size.x * 1.5);
    walker.dispose();
  });

  it("TC-P9-017 the head turns toward the pointer, and a meow opens the mouth", () => {
    const cat = SHOP_CATS[0]!;
    const model = buildCat(cat.look, cat.pose, 1);
    const head = () => {
      let found: THREE.Object3D | null = null;
      model.root.traverse((o) => {
        if (!found && o.children.some((c) => c instanceof THREE.LineSegments))
          found = o;
      });
      return found! as THREE.Object3D;
    };
    for (let i = 0; i < 60; i += 1)
      model.update(1 / 30, i / 30, { x: 1, y: 0 });
    const right = head().rotation.y;
    for (let i = 0; i < 60; i += 1)
      model.update(1 / 30, 2 + i / 30, { x: -1, y: 0 });
    expect(head().rotation.y).toBeLessThan(right - 0.5);

    const mouthHeight = () => {
      let tallest = 0;
      head().traverse((o) => {
        const m = o as THREE.Mesh;
        if (
          m.isMesh &&
          (m.material as THREE.MeshStandardMaterial).color.getHexString() ===
            "5b2e33"
        )
          tallest = m.scale.y;
      });
      return tallest;
    };
    expect(mouthHeight()).toBeLessThan(0.1);
    model.meow();
    model.update(0.25, 5, { x: 0, y: 0 });
    expect(mouthHeight()).toBeGreaterThan(0.5);
    model.dispose();
  });

  it("TC-P9-013 a walking cat steps its legs; standing still, they stay put", () => {
    const model = buildCat(SHOP_CATS[1]!.look, "walk", 3);
    // a hip holds the upper leg, a capsule 0.058 across
    const hips: THREE.Object3D[] = [];
    model.root.traverse((o) => {
      if (
        o.children.some(
          (c) =>
            (c as THREE.Mesh).geometry instanceof THREE.CapsuleGeometry &&
            ((c as THREE.Mesh).geometry as THREE.CapsuleGeometry).parameters
              .radius === 0.058,
        )
      )
        hips.push(o);
    });
    expect(hips).toHaveLength(4);
    const legs = () => hips.map((hip) => hip.rotation.x);
    for (let i = 0; i < 60; i += 1)
      model.update(1 / 30, i / 30, { x: 0, y: 0 }, 0);
    for (const turn of legs()) expect(Math.abs(turn)).toBeLessThan(0.01);
    const snapshots: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      model.update(1 / 30, 2 + i / 30, { x: 0, y: 0 }, 1);
      if (i % 5 === 0)
        snapshots.push(
          legs()
            .map((t) => t.toFixed(2))
            .join(),
        );
    }
    // the stride changes from frame to frame
    expect(new Set(snapshots).size).toBeGreaterThan(4);
    model.dispose();
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
