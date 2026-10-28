import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  curtainMoving,
  setCurtainCovering,
  setCurtainSettled,
  whenCurtainOpens,
  whenCurtainSettles,
} from "@/components/motion/curtain-state";
import { useScene } from "@/components/three/canvas/use-scene";
import { addFrame } from "@/components/three/engine/loop";
import { makeRenderer, shadowPacer } from "@/components/three/engine/renderer";
import {
  FRAME_BUDGET_MS,
  FrameBudget,
  resetFrameBudgets,
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

afterEach(() => {
  setCurtainSettled();
  resetFrameBudgets();
  vi.unstubAllGlobals();
});

describe("3D frame pacing (TC-P4-180 – TC-P4-186)", () => {
  it("TC-P4-180 — the curtain counts as moving from the moment it starts closing until it has fully opened", () => {
    const opened = vi.fn();
    const settled = vi.fn();
    const dropped = vi.fn();
    expect(curtainMoving()).toBe(false);

    setCurtainCovering(true);
    expect(curtainMoving()).toBe(true);
    whenCurtainOpens(opened);
    whenCurtainSettles(settled);
    const cancel = whenCurtainSettles(dropped);
    cancel();

    // the curtain starts opening: entrances go, scenes still wait
    setCurtainCovering(false);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(settled).not.toHaveBeenCalled();
    expect(curtainMoving()).toBe(true);

    setCurtainSettled();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(dropped).not.toHaveBeenCalled();
    expect(curtainMoving()).toBe(false);

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

  it("TC-P4-181 — 3D scenes skip their frames while the curtain moves and carry on after", () => {
    const frame = vi.fn();
    const stop = addFrame(frame);
    const tick = () => ticker.tick?.(0, 16);

    tick();
    expect(frame).toHaveBeenCalledTimes(1);

    setCurtainCovering(true);
    tick();
    tick();
    setCurtainCovering(false);
    tick();
    expect(frame).toHaveBeenCalledTimes(1);

    setCurtainSettled();
    tick();
    expect(frame).toHaveBeenCalledTimes(2);
    // the scene clock stood still while the scene rested
    expect(frame.mock.calls[1]?.[1]).toBeCloseTo(0.032);
    stop();
  });

  it("TC-P4-182 — a scene on the page the curtain opens onto starts only after the curtain has fully opened", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
    }));
    const init = vi.fn(async () => ({ frame: () => {}, dispose: () => {} }));
    function Stage() {
      const canvasRef = useScene(init);
      return <canvas ref={canvasRef} />;
    }

    setCurtainCovering(true);
    render(<Stage />);
    await pause();
    expect(init).not.toHaveBeenCalled();

    setCurtainCovering(false);
    await pause();
    expect(init).not.toHaveBeenCalled();

    setCurtainSettled();
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  });

  it("TC-P4-183 — the frame budget steps effects down one at a time while frames average slower than 22 ms", () => {
    expect(FRAME_BUDGET_MS).toBe(22);

    // 60 frames a second with one long page task: no step
    const smooth = vi.fn();
    const steady = new FrameBudget(FRAME_BUDGET_MS, [smooth]);
    frames(steady, 59, 16.7);
    steady.push(1000);
    frames(steady, 120, 16.7);
    expect(smooth).not.toHaveBeenCalled();

    // `?quality=high` keeps every effect on
    const kept = vi.fn();
    frames(new FrameBudget(FRAME_BUDGET_MS, [kept], true), 300, 40);
    expect(kept).not.toHaveBeenCalled();

    // 25 frames a second: the first 30 frames settle, the next 30 measure
    const steps = [vi.fn(), vi.fn()];
    const slow = new FrameBudget(FRAME_BUDGET_MS, steps);
    frames(slow, 59, 40);
    expect(steps[0]).not.toHaveBeenCalled();
    slow.push(40);
    expect(steps[0]).toHaveBeenCalledTimes(1);
    expect(slow.level).toBe(1);

    // the cheaper settings settle and are measured afresh before step two
    frames(slow, 59, 40);
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
    frames(first, 60, 40);
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
    const desktop: Quality = {
      mobile: false,
      maxDpr: 1.5,
      forceHigh: false,
      lite: false,
    };
    const phone: Quality = {
      mobile: true,
      maxDpr: 1.25,
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
    expect(antialias(phone)).toBe(false);
    expect(antialias(phone, true)).toBe(false);
  });
});
