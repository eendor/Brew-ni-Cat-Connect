import { act, render } from "@testing-library/react";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  curtainMoving,
  holdCurtain,
  setCurtainCovering,
  setCurtainSettled,
  whenCurtainOpens,
  whenCurtainSettles,
  whenCurtainUnheld,
} from "@/components/motion/curtain-state";
import { useCurtainHold } from "@/components/motion/use-curtain-hold";
import { useScene } from "@/components/three/canvas/use-scene";
import { addFrame } from "@/components/three/engine/loop";
import {
  makeRenderer,
  shadowPacer,
  warmUp,
} from "@/components/three/engine/renderer";
import {
  FRAME_BUDGET_MS,
  FrameBudget,
  getQuality,
  resetFrameBudgets,
  watchVisible,
  type Quality,
} from "@/components/three/engine/runtime";

// jsdom has no WebGL, so the renderer is a stand-in that keeps its settings
vi.mock("three", async (importOriginal) => {
  const three = await importOriginal<typeof import("three")>();
  class WebGLRenderer {
    shadowMap = {
      enabled: false,
      type: 0,
      autoUpdate: true,
      needsUpdate: false,
    };
    debug = { checkShaderErrors: true };
    capabilities = { getMaxAnisotropy: vi.fn(() => 16) };
    constructor(readonly parameters: Record<string, unknown>) {}
    setPixelRatio() {}
  }
  return { ...three, WebGLRenderer };
});

// the shared loop runs on GSAP's ticker; here the test drives each tick
const ticker = vi.hoisted(() => ({
  tick: null as null | ((time: number, deltaMs: number) => void),
}));
vi.mock("gsap", () => ({
  default: {
    ticker: {
      add: (callback: (time: number, deltaMs: number) => void) => {
        ticker.tick = callback;
      },
      lagSmoothing: () => {},
    },
  },
}));

const pause = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

function frames(budget: FrameBudget, count: number, ms: number) {
  for (let i = 0; i < count; i += 1) budget.push(ms);
}

/** A desktop-sized screen with a fine pointer. */
function desktopScreen() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
  }));
}

const desktop: Quality = {
  mobile: false,
  maxDpr: 1.5,
  forceHigh: false,
  lite: false,
};

afterEach(() => {
  setCurtainSettled();
  resetFrameBudgets();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("3D frame pacing (TC-P4-180 – TC-P4-186, TC-P4-191 – TC-P4-196)", () => {
  it("TC-P4-180 — the curtain counts as moving from the moment it starts closing until it has fully opened", () => {
    const opened = vi.fn();
    const settled = vi.fn();
    const dropped = vi.fn();
    const marked = () => document.documentElement.hasAttribute("data-curtain");
    expect(curtainMoving()).toBe(false);
    expect(marked()).toBe(false);

    setCurtainCovering(true);
    expect(curtainMoving()).toBe(true);
    expect(marked()).toBe(true);
    whenCurtainOpens(opened);
    whenCurtainSettles(settled);
    const cancel = whenCurtainSettles(dropped);
    cancel();

    // the curtain starts opening: entrances go, scenes further down wait
    setCurtainCovering(false);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(settled).not.toHaveBeenCalled();
    expect(curtainMoving()).toBe(true);
    expect(marked()).toBe(true);

    setCurtainSettled();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(dropped).not.toHaveBeenCalled();
    expect(curtainMoving()).toBe(false);
    expect(marked()).toBe(false);

    // with the curtain still, callbacks run at once
    const now = vi.fn();
    whenCurtainSettles(now);
    expect(now).toHaveBeenCalledTimes(1);

    // a curtain taken down part-way releases everything that waited
    const late = vi.fn();
    setCurtainCovering(true);
    whenCurtainOpens(late);
    setCurtainSettled();
    expect(late).toHaveBeenCalledTimes(1);
    expect(curtainMoving()).toBe(false);
  });

  it("TC-P4-181 — 3D scenes skip their frames while the curtain covers the page and run again as it opens", () => {
    const frame = vi.fn();
    const stop = addFrame(frame);
    const tick = () => ticker.tick?.(0, 16);

    tick();
    expect(frame).toHaveBeenCalledTimes(1);

    setCurtainCovering(true);
    tick();
    tick();
    expect(frame).toHaveBeenCalledTimes(1);

    // the hero 3D moves while the curtain wipes away
    setCurtainCovering(false);
    tick();
    expect(frame).toHaveBeenCalledTimes(2);
    // the scene clock stood still while the scene rested
    expect(frame.mock.calls[1]?.[1]).toBeCloseTo(0.032);

    setCurtainSettled();
    tick();
    expect(frame).toHaveBeenCalledTimes(3);
    stop();
  });

  it("TC-P4-182 — a hero scene builds and draws its first frame behind the curtain; other scenes start once it has fully opened", async () => {
    desktopScreen();
    const steps: string[] = [];
    const hero = vi.fn(async () => ({
      frame: (dt: number, time: number) => steps.push(`frame ${dt} ${time}`),
      dispose: () => {},
    }));
    const below = vi.fn(async () => ({ frame: () => {}, dispose: () => {} }));
    function Page() {
      const heroRef = useScene(hero, {
        underCurtain: true,
        onReady: () => steps.push("ready"),
      });
      const belowRef = useScene(below);
      return (
        <>
          <canvas ref={heroRef} />
          <canvas ref={belowRef} />
        </>
      );
    }

    setCurtainCovering(true);
    render(<Page />);
    // drawn once before it reports ready, so it is there when shown
    await vi.waitFor(() => expect(steps).toEqual(["frame 0 0", "ready"]));
    expect(below).not.toHaveBeenCalled();

    setCurtainCovering(false);
    await pause();
    expect(below).not.toHaveBeenCalled();

    setCurtainSettled();
    await vi.waitFor(() => expect(below).toHaveBeenCalledTimes(1));
  });

  it("TC-P4-183 — the frame budget steps effects down one at a time while over a quarter of frames take longer than 20 ms", () => {
    expect(FRAME_BUDGET_MS).toBe(20);

    // 60 fps with a long page task every sixth frame: no step, though those
    // frames take the average over 20 ms
    const smooth = vi.fn();
    const steady = new FrameBudget(FRAME_BUDGET_MS, [smooth]);
    for (let i = 0; i < 300; i += 1) steady.push(i % 6 === 0 ? 70 : 12);
    expect(smooth).not.toHaveBeenCalled();

    // every third frame misses the refresh: a step, though the average
    // stays under 20 ms
    const missed = vi.fn();
    const uneven = new FrameBudget(FRAME_BUDGET_MS, [missed]);
    for (let i = 0; i < 90; i += 1) uneven.push(i % 3 === 0 ? 24 : 16);
    expect(missed).toHaveBeenCalledTimes(1);
    // the cases below start as fresh visits
    resetFrameBudgets();

    // `?quality=high` keeps every effect on
    const kept = vi.fn();
    frames(new FrameBudget(FRAME_BUDGET_MS, [kept], true), 300, 40);
    expect(kept).not.toHaveBeenCalled();

    // 25 frames a second: the first 30 frames settle, the next 60 measure
    const steps = [vi.fn(), vi.fn()];
    const slow = new FrameBudget(FRAME_BUDGET_MS, steps);
    frames(slow, 89, 40);
    expect(steps[0]).not.toHaveBeenCalled();
    slow.push(40);
    expect(steps[0]).toHaveBeenCalledTimes(1);
    expect(slow.level).toBe(1);

    // the cheaper settings settle and are measured afresh before step two
    frames(slow, 89, 40);
    expect(steps[1]).not.toHaveBeenCalled();
    slow.push(40);
    expect(steps[1]).toHaveBeenCalledTimes(1);

    // nothing left to switch off
    frames(slow, 300, 40);
    expect(steps[0]).toHaveBeenCalledTimes(1);
    expect(steps[1]).toHaveBeenCalledTimes(1);
    expect(slow.level).toBe(2);
  });

  it("TC-P4-184 — a scene started later in the visit begins at the step earlier scenes reached", () => {
    const first = new FrameBudget(FRAME_BUDGET_MS, [vi.fn(), vi.fn()]);
    frames(first, 90, 40);
    expect(first.level).toBe(1);

    const steps = [vi.fn(), vi.fn(), vi.fn()];
    const next = new FrameBudget(FRAME_BUDGET_MS, steps);
    expect(steps[0]).not.toHaveBeenCalled();
    next.push(16.7);
    expect(steps[0]).toHaveBeenCalledTimes(1);
    expect(steps[1]).not.toHaveBeenCalled();
    expect(next.level).toBe(1);

    // smooth frames from here on take it no further
    frames(next, 200, 16.7);
    expect(next.level).toBe(1);

    // `?quality=high` still keeps every effect on
    const kept = vi.fn();
    new FrameBudget(FRAME_BUDGET_MS, [kept], true).push(16.7);
    expect(kept).not.toHaveBeenCalled();
  });

  it("TC-P4-185 — shadows are drawn once a frame, then every third frame once slowed down", () => {
    const renderer = {
      shadowMap: { autoUpdate: true, needsUpdate: false },
    } as unknown as Parameters<typeof shadowPacer>[0];
    const shadows = shadowPacer(renderer);
    // three.js no longer redraws them on each of the frame's render calls
    expect(renderer.shadowMap.autoUpdate).toBe(false);
    const drawn = () => {
      shadows.beforeFrame();
      return renderer.shadowMap.needsUpdate;
    };

    expect([drawn(), drawn(), drawn()]).toEqual([true, true, true]);
    shadows.slowDown();
    expect([drawn(), drawn(), drawn(), drawn(), drawn(), drawn()]).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it("TC-P4-186 — a canvas drawn through post-processing doesn't multisample; other desktop canvases do, phone canvases never", () => {
    const phone: Quality = {
      mobile: true,
      maxDpr: 1,
      forceHigh: false,
      lite: true,
    };
    const antialias = (quality: Quality, post = false) => {
      const canvas = document.createElement("canvas");
      const renderer = makeRenderer(canvas, quality, { post });
      return (renderer as unknown as { parameters: { antialias: boolean } })
        .parameters.antialias;
    };

    expect(antialias(desktop)).toBe(true);
    expect(antialias(desktop, true)).toBe(false);
    expect(antialias({ ...desktop, maxDpr: 1, lite: true })).toBe(true);
    expect(antialias(phone)).toBe(false);
    expect(antialias(phone, true)).toBe(false);
  });

  it("TC-P4-191 — a device still too slow with every step taken starts lite on later scenes and visits for 7 days", () => {
    desktopScreen();
    expect(getQuality().lite).toBe(false);

    const slow = new FrameBudget(FRAME_BUDGET_MS, [vi.fn()]);
    frames(slow, 90, 40);
    expect(slow.level).toBe(1);
    expect(getQuality().lite).toBe(false);
    frames(slow, 90, 40);
    expect(getQuality()).toMatchObject({ lite: true, maxDpr: 1 });

    // a later visit on this device
    resetFrameBudgets();
    expect(getQuality().lite).toBe(true);
    // a week later it gets the full tier again
    const eightDays = 8 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem("bnc-3d-lite", String(Date.now() - eightDays));
    expect(getQuality().lite).toBe(false);

    // with storage blocked it is remembered for this visit only
    window.localStorage.clear();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const blocked = new FrameBudget(FRAME_BUDGET_MS, []);
    frames(blocked, 90, 40);
    expect(getQuality().lite).toBe(true);
    resetFrameBudgets();
    expect(getQuality().lite).toBe(false);
  });

  it("TC-P4-192 — a hero scene still building holds the curtain closed, only while the curtain covers its page", () => {
    // nothing holds it: the curtain opens at once
    const free = vi.fn();
    whenCurtainUnheld(free);
    expect(free).toHaveBeenCalledTimes(1);

    // two scenes hold it; it opens when the last one lets go
    const first = holdCurtain();
    const second = holdCurtain();
    const open = vi.fn();
    const cancelled = vi.fn();
    whenCurtainUnheld(open);
    whenCurtainUnheld(cancelled)();
    first();
    first();
    expect(open).not.toHaveBeenCalled();
    second();
    expect(open).toHaveBeenCalledTimes(1);
    expect(cancelled).not.toHaveBeenCalled();

    function Hero({ waiting }: { waiting: boolean }) {
      useCurtainHold(waiting);
      return null;
    }
    // a page opened directly has no curtain to hold
    const direct = render(<Hero waiting />);
    const shown = vi.fn();
    whenCurtainUnheld(shown);
    expect(shown).toHaveBeenCalledTimes(1);
    direct.unmount();

    setCurtainCovering(true);
    const view = render(<Hero waiting />);
    const ready = vi.fn();
    whenCurtainUnheld(ready);
    expect(ready).not.toHaveBeenCalled();
    view.rerender(<Hero waiting={false} />);
    expect(ready).toHaveBeenCalledTimes(1);

    // a page left before its scene drew lets go as well
    const left = render(<Hero waiting />);
    const gone = vi.fn();
    whenCurtainUnheld(gone);
    left.unmount();
    expect(gone).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("TC-P4-194 — a scene's visibility starts from where its canvas is now, before the observer reports", () => {
    let report: ((entries: { isIntersecting: boolean }[]) => void) | null =
      null;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const visibleAt = (top: number, height = 300) => {
      const element = document.createElement("div");
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
        top,
        bottom: top + height,
      } as DOMRect);
      const state = watchVisible(element);
      state.dispose();
      return state.visible;
    };
    const fold = window.innerHeight;

    expect(visibleAt(100)).toBe(true);
    // within the 160 px margin below the fold
    expect(visibleAt(fold + 100)).toBe(true);
    expect(visibleAt(fold + 2000)).toBe(false);
    expect(visibleAt(-2000)).toBe(false);

    // the observer takes over from there
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      top: fold + 2000,
      bottom: fold + 2300,
    } as DOMRect);
    const state = watchVisible(element);
    expect(state.visible).toBe(false);
    act(() => report?.([{ isIntersecting: true }]));
    expect(state.visible).toBe(true);
  });

  it("TC-P4-195 — the warm-up draws once with hidden and off-screen parts shown, then puts them back", () => {
    const scene = new THREE.Scene();
    const hidden = new THREE.Mesh();
    hidden.visible = false;
    const shown = new THREE.Mesh();
    const light = new THREE.PointLight();
    light.visible = false;
    const uncullable = new THREE.Mesh();
    uncullable.frustumCulled = false;
    scene.add(hidden, shown, light, uncullable);
    const renderer = { shadowMap: { enabled: true, needsUpdate: false } };
    const during: boolean[][] = [];

    warmUp(renderer as never, scene, () => {
      during.push([hidden.visible, light.visible, shown.frustumCulled]);
    });
    // during the draw: the hidden part shown, the light left off, nothing culled
    expect(during).toEqual([[true, false, false]]);
    expect(renderer.shadowMap.needsUpdate).toBe(true);
    expect(hidden.visible).toBe(false);
    expect(light.visible).toBe(false);
    expect(shown.frustumCulled).toBe(true);
    expect(uncullable.frustumCulled).toBe(false);

    // a failed draw still puts everything back
    expect(() =>
      warmUp(renderer as never, scene, () => {
        throw new Error("context lost");
      }),
    ).toThrow("context lost");
    expect(hidden.visible).toBe(false);
    expect(shown.frustumCulled).toBe(true);
  });

  it("TC-P4-196 — production renderers skip the blocking shader checks and ask the GPU's anisotropy as they start", () => {
    type Stand = {
      debug: { checkShaderErrors: boolean };
      capabilities: { getMaxAnisotropy: () => number };
    };
    const make = () =>
      makeRenderer(
        document.createElement("canvas"),
        desktop,
      ) as unknown as Stand;

    vi.stubEnv("NODE_ENV", "production");
    const live = make();
    expect(live.debug.checkShaderErrors).toBe(false);
    expect(live.capabilities.getMaxAnisotropy).toHaveBeenCalledTimes(1);

    vi.stubEnv("NODE_ENV", "development");
    expect(make().debug.checkShaderErrors).toBe(true);
  });
});
