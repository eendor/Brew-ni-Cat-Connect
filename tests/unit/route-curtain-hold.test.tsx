import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  curtainCovering,
  holdCurtain,
  setCurtainSettled,
} from "@/components/motion/curtain-state";
import { RouteCurtain } from "@/components/motion/route-curtain";

// a stand-in router: each test moves the path itself
const route = vi.hoisted(() => ({
  pathname: "/",
  router: { push: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useRouter: () => route.router,
}));
vi.mock("next/image", () => ({ default: () => null }));
// every tween finishes at once
vi.mock("@/components/motion/gsap", () => {
  const timeline = () => {
    const chain = {
      set: () => chain,
      to: () => chain,
      add: (step: () => void) => {
        step();
        return chain;
      },
      call: (step: () => void) => {
        step();
        return chain;
      },
      kill: () => {},
    };
    return chain;
  };
  return {
    EASE: { enter: "none", exit: "none", wipe: "none" },
    gsap: { timeline },
    motionAllowed: () => true,
  };
});

/** Clicks a link to `path`, then renders the new route behind the curtain. */
function navigate(view: ReturnType<typeof render>, path: string) {
  const link = document.createElement("a");
  link.href = path;
  document.body.append(link);
  act(() => link.click());
  link.remove();
  route.pathname = path;
  view.rerender(<RouteCurtain />);
}

afterEach(() => {
  vi.useRealTimers();
  setCurtainSettled();
  route.pathname = "/";
});

describe("route curtain hold (TC-P4-193)", () => {
  it("TC-P4-193 — the curtain opens once the new page's hero 3D has drawn, and after 1.8 s at most", () => {
    vi.useFakeTimers();
    const view = render(<RouteCurtain />);

    // the new page's hero scene is still building: the curtain waits
    const drawn = holdCurtain();
    navigate(view, "/menu");
    expect(route.router.push).toHaveBeenCalledWith("/menu");
    act(() => vi.advanceTimersByTime(1000));
    expect(curtainCovering()).toBe(true);
    act(() => drawn());
    expect(curtainCovering()).toBe(false);

    // a scene that never draws keeps it closed for 1.8 s at most
    const stuck = holdCurtain();
    navigate(view, "/about");
    act(() => vi.advanceTimersByTime(1799));
    expect(curtainCovering()).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(curtainCovering()).toBe(false);
    stuck();

    // nothing to wait for: it opens as soon as the page is in
    navigate(view, "/gallery");
    expect(curtainCovering()).toBe(false);
    view.unmount();
  });
});
