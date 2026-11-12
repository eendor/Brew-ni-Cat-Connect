import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatCompanions } from "@/components/cats/cat-companions";
import { CatSoundsToggle } from "@/components/cats/cat-sounds-toggle";
import {
  setCurtainCovering,
  setCurtainSettled,
} from "@/components/motion/curtain-state";
import {
  boxesOverlap,
  catCount,
  catHeight,
  catsFor,
  catSrc,
  PERCHES,
  perchBox,
  SHOP_CATS,
  stayMs,
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

/** Gives an element a box on screen (jsdom has no layout); by default the whole screen. */
function onScreen(
  element: Element,
  r = { left: 0, top: 0, right: 1440, bottom: 900 },
) {
  element.getBoundingClientRect = () =>
    ({
      ...r,
      x: r.left,
      y: r.top,
      width: r.right - r.left,
      height: r.bottom - r.top,
    }) as DOMRect;
  return element;
}

const shown = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLImageElement>(".shop-cat")].filter(
    (n) => n.dataset.shown === "true",
  );

function box(node: HTMLElement) {
  const left = Number.parseFloat(node.style.left);
  const top = Number.parseFloat(node.style.top);
  return {
    left,
    top,
    right: left + Number.parseFloat(node.style.width),
    bottom: top + Number.parseFloat(node.style.height),
  };
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
  // Update 2026-11-13 (ADR-032): the shop's own cats, cut out of its photos,
  // replace the pixel cats, and they perch around the page instead of in a
  // strip in the footer.
  it("TC-P9-001 seven pictures of the shop's cats, sized by the screen, more of them on wider screens", () => {
    expect(SHOP_CATS.map((c) => c.id)).toEqual([
      "kasper",
      "latte",
      "luna",
      "kulas",
      "oreo",
      "grey",
      "kasper-nap",
    ]);
    expect(catSrc("luna")).toBe("/cats/luna.webp");
    // they scale with the screen, within limits
    expect(catHeight(390, 844)).toBe(84);
    expect(catHeight(1440, 900)).toBe(158);
    expect(catHeight(3840, 2160)).toBe(220);
    expect(catHeight(1024, 768)).toBeGreaterThan(catHeight(390, 844));
    expect(catCount(390)).toBe(2);
    expect(catCount(800)).toBe(3);
    expect(catCount(1280)).toBe(4);
    expect(catCount(1920)).toBe(5);
    // the napping cat only rises from the bottom edge
    expect(catsFor({ side: "left", at: 0.5 }).map((c) => c.id)).not.toContain(
      "kasper-nap",
    );
    expect(catsFor({ side: "bottom", at: 0.5 }).map((c) => c.id)).toContain(
      "kasper-nap",
    );
    expect(stayMs(0)).toBe(14_000);
    expect(stayMs(1)).toBe(30_000);
  });

  it("TC-P9-002 the layer is hidden from screen readers and every spot stays on the screen", () => {
    mockReducedMotion(true);
    render(<CatCompanions />);
    const layer = screen.getByTestId("cat-layer");
    expect(layer).toHaveAttribute("aria-hidden", "true");
    for (const img of layer.querySelectorAll("img"))
      expect(img).toHaveAttribute("alt", "");
    for (const perch of PERCHES) {
      const b = perchBox(perch, 100, 160, 390, 844);
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(390);
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(844);
    }
  });

  it("TC-P9-003 on a clear page the cats fill their spots without touching each other", () => {
    mockReducedMotion(true);
    const { container } = render(<CatCompanions />);
    const cats = shown(container);
    expect(cats).toHaveLength(catCount(1440));
    const ids = cats.map((c) => c.dataset.cat);
    expect(new Set(ids).size).toBe(ids.length);
    const boxes = cats.map(box);
    for (let i = 0; i < boxes.length; i += 1)
      for (let j = i + 1; j < boxes.length; j += 1)
        expect(boxesOverlap(boxes[i]!, boxes[j]!)).toBe(false);
  });

  it("TC-P9-004 with reduced motion the cats appear in place and stay still", () => {
    mockReducedMotion(true);
    const { container } = render(<CatCompanions />);
    for (const cat of shown(container)) {
      expect(cat.style.opacity).toBe("1");
      expect(cat.style.transform).toBe("");
    }
  });

  it("TC-P9-013 no cat comes out over the page's text, controls or pictures", () => {
    mockReducedMotion(true);
    for (const tag of ["p", "button", "img", "a", "h2"]) {
      const element = onScreen(document.createElement(tag));
      document.body.append(element);
      const { container, unmount } = render(<CatCompanions />);
      expect(shown(container)).toHaveLength(0);
      unmount();
      element.remove();
    }
    // a paragraph in the middle of the screen leaves the edges to the cats
    const middle = onScreen(document.createElement("p"), {
      left: 400,
      top: 100,
      right: 1040,
      bottom: 800,
    });
    document.body.append(middle);
    const { container: withText, unmount } = render(<CatCompanions />);
    expect(shown(withText).length).toBeGreaterThan(0);
    unmount();
    middle.remove();
    // a decorative (aria-hidden) layer doesn't count
    const decor = document.createElement("div");
    decor.setAttribute("aria-hidden", "true");
    decor.append(onScreen(document.createElement("img")));
    document.body.append(decor);
    const { container } = render(<CatCompanions />);
    expect(shown(container).length).toBeGreaterThan(0);
    decor.remove();
  });

  it("TC-P9-014 a cat on screen ducks away once content scrolls under it", () => {
    mockReducedMotion(true);
    const { container } = render(<CatCompanions />);
    expect(shown(container).length).toBeGreaterThan(0);
    const button = onScreen(document.createElement("button"));
    document.body.append(button);
    act(() => void window.dispatchEvent(new Event("scroll")));
    expect(shown(container)).toHaveLength(0);
    button.remove();
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
        <CatCompanions />
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
