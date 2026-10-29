import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeShowcase } from "@/components/three/home-showcase";
import { showcaseItems } from "@/components/three/showcase-data";

// WebGL is on, and the 3D canvas is a stand-in that keeps the props it got
const canvas = vi.hoisted(() => ({
  props: null as null | Record<string, unknown>,
}));
vi.mock("@/components/three/use-three-enabled", () => ({
  useThreeEnabled: () => true,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function ShowcaseCanvas(props: Record<string, unknown>) {
      canvas.props = props;
      return null;
    },
}));

afterEach(() => {
  vi.restoreAllMocks();
  canvas.props = null;
});

function section() {
  const element = document.getElementById("home-showcase");
  if (!element) throw new Error("showcase section missing");
  return element;
}

describe("Home showcase on the page scroll (TC-P4-187 – TC-P4-188)", () => {
  it("TC-P4-187 — the 3D showcase follows the page scroll, and an item button scrolls the page to that item", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<HomeShowcase />);
    expect(section()).toHaveClass("showcase--3d");
    // the scene reads its progress from the page scroll through this section
    expect(canvas.props).toMatchObject({ sectionId: "home-showcase" });
    expect(canvas.props).not.toHaveProperty("target");

    Object.defineProperty(section(), "offsetTop", { value: 120 });
    Object.defineProperty(section(), "offsetHeight", { value: 5200 });
    const length = 5200 - window.innerHeight;
    const buttons = within(
      screen.getByRole("list", { name: "Jump to a featured item" }),
    ).getAllByRole("button");
    expect(buttons).toHaveLength(showcaseItems.length);

    // the third of five items rests 2.2 / 4.5 of the way through
    fireEvent.click(buttons[2]!);
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: expect.closeTo(120 + length * (2.2 / 4.5), 5),
      behavior: "smooth",
    });
    fireEvent.click(buttons[0]!);
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 120,
      behavior: "smooth",
    });
    fireEvent.click(buttons[4]!);
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: expect.closeTo(120 + length * (4.2 / 4.5), 5),
      behavior: "smooth",
    });
  });

  it("TC-P4-188 — the glow behind the hero updates at most every 120 ms", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    render(<HomeShowcase />);
    const onGlow = canvas.props?.onGlow as (hex: string) => void;
    const glow = () => section().style.getPropertyValue("--glow");

    onGlow("#111111");
    expect(glow()).toBe("#111111");
    now.mockReturnValue(1060);
    onGlow("#222222");
    expect(glow()).toBe("#111111");
    // the scene reports the colour every frame, so the latest one lands
    now.mockReturnValue(1130);
    onGlow("#222222");
    expect(glow()).toBe("#222222");
  });
});
