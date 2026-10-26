import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuItemOrderDialog } from "@/components/menu/menu-item-order-dialog";
import { menuModelSpec, modelSpecFor } from "@/components/three/menu-models";
import { getMenuCutout } from "@/config/menu-item-images";
import { CartProvider } from "@/context/cart-context";
import type { MenuItem, MenuVariant } from "@/types/menu";

const three = vi.hoisted(() => ({ enabled: true, fail: false }));

vi.mock("@/components/three/use-three-enabled", () => ({
  useThreeEnabled: () => three.enabled,
}));

// jsdom has no WebGL: this stand-in canvas reports ready (or failed) the
// way the real one does and shows which model it was asked to build.
vi.mock("@/components/three/canvas/menu-stage-canvas", async () => {
  const { createElement, useEffect } = await import("react");
  type Props = {
    spec: { key: string };
    onReady?: () => void;
    onError?: () => void;
  };
  function MockStageCanvas({ spec, onReady, onError }: Props) {
    useEffect(() => {
      if (three.fail) onError?.();
      else onReady?.();
    }, [spec.key, onReady, onError]);
    return createElement("canvas", {
      "data-testid": "menu-stage-canvas",
      "data-model": spec.key,
    });
  }
  return { default: MockStageCanvas };
});

function size(id: string, name: string, basePrice: number): MenuVariant {
  return { id, name, basePrice, flavorPrices: [], description: null };
}

const cupSizes = (prefix: string, prices: readonly [number, number, number]) =>
  (["12oz", "16oz", "22oz"] as const).map((name, index) =>
    size(`${prefix}-${name}`, name, prices[index] ?? 0),
  );

const matcha: MenuItem = {
  id: "matcha",
  name: "Matcha (The Lucky Green Neko)",
  availability: "available",
  flavors: [
    "Dirty Neko",
    "Vanilla Matcha Meow",
    "Caramel Matcha Tail",
    "Salted Caramel Meow-cha",
  ],
  variants: cupSizes("matcha", [49, 59, 79]),
};

const takoyakiFlavors = [
  "Veggie Whiskers",
  "Cheesy Calico",
  "Squid Treats",
  "Shrimp Whisker",
];
// sorted by flavor name, as the catalog mapper hands them over
const perFlavor = (id: string, name: string, prices: readonly number[]) => ({
  ...size(id, name, 0),
  flavorPrices: takoyakiFlavors
    .map((flavor, index) => ({ flavor, price: prices[index] ?? 0 }))
    .sort((left, right) => left.flavor.localeCompare(right.flavor)),
});
const takoyaki: MenuItem = {
  id: "takoyaki",
  name: "Takoyaki (Pawsome Balls)",
  availability: "available",
  flavors: takoyakiFlavors,
  variants: [
    perFlavor("tako-4", "4pcs", [40, 50, 55, 60]),
    perFlavor("tako-8", "8pcs", [80, 100, 110, 120]),
  ],
};

const soldOutOreo: MenuItem = {
  id: "oreo",
  name: "Oreo (The Tuxedo Cat)",
  availability: "unavailable",
  flavors: ["Caramel Oreo Kitten", "Oreo Iced Paw-tte", "Vanilla Oreo Whisker"],
  variants: cupSizes("oreo", [49, 59, 79]),
};

const mystery: MenuItem = {
  id: "mystery",
  name: "Mystery Brew",
  availability: "available",
  flavors: [],
  variants: [size("mystery-16", "16oz", 70)],
};

const MATCHA_PHOTO =
  "The Lucky Green Neko iced dirty matcha with an espresso layer";

function renderCard(item: MenuItem, categoryName = "Drinks") {
  return render(
    <CartProvider storageKey="test_menu_viewer_storage">
      <MenuItemCard item={item} categoryName={categoryName} />
    </CartProvider>,
  );
}

async function openOrder(item: MenuItem) {
  await userEvent.click(
    screen.getByRole("button", { name: `Order ${item.name}` }),
  );
  return screen.getByRole("dialog", { name: item.name });
}

describe("3D lives in the Add to order dialog (TC-P4-138 – TC-P4-143)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    three.enabled = true;
    three.fail = false;
  });

  it("TC-P4-138 — a menu card shows its photo and no 3D canvas; the dialog floats the product", async () => {
    renderCard(matcha);
    expect(screen.getByAltText(MATCHA_PHOTO)).toBeInTheDocument();
    expect(screen.queryByTestId("menu-stage-canvas")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /in 3D/i }),
    ).not.toBeInTheDocument();

    const dialog = await openOrder(matcha);
    const canvas = await within(dialog).findByTestId("menu-stage-canvas");
    expect(canvas).toHaveAttribute("data-model", modelSpecFor(matcha)?.key);
  });

  it("TC-P4-139 — an item with no photo and no hand-built model gets a generic cup or box in the dialog", async () => {
    const { unmount } = renderCard(mystery, "Drinks");
    let dialog = await openOrder(mystery);
    expect(
      await within(dialog).findByTestId("menu-stage-canvas"),
    ).toHaveAttribute("data-model", menuModelSpec(mystery, "Drinks").key);
    expect(menuModelSpec(mystery, "Drinks")).toMatchObject({ kind: "cup" });
    unmount();

    renderCard(mystery, "Snacks");
    dialog = await openOrder(mystery);
    expect(
      await within(dialog).findByTestId("menu-stage-canvas"),
    ).toHaveAttribute("data-model", menuModelSpec(mystery, "Snacks").key);
    expect(menuModelSpec(mystery, "Snacks")).toMatchObject({
      kind: "takeout-box",
    });
  });

  it("TC-P4-140 — hand-built models win over the generic one", () => {
    expect(menuModelSpec(matcha, "Drinks").key).toBe(modelSpecFor(matcha)?.key);
    expect(menuModelSpec(takoyaki, "Food").key).toBe(
      modelSpecFor(takoyaki)?.key,
    );
  });

  it("TC-P4-141 — without WebGL or with reduced motion the dialog keeps the photo and has no canvas", async () => {
    three.enabled = false;
    renderCard(matcha);
    const dialog = await openOrder(matcha);
    expect(
      within(dialog).queryByTestId("menu-stage-canvas"),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByAltText(MATCHA_PHOTO)).toBeInTheDocument();
  });

  it("TC-P4-149 — before the 3D frame is drawn, or with 3D off, a product with a cut-out shows the still cut-out, not the full photo", async () => {
    three.enabled = false;
    renderCard(takoyaki);
    const dialog = await openOrder(takoyaki);
    const picture = within(dialog).getByRole("img", { name: /Takoyaki balls/ });
    expect(decodeURIComponent(picture.getAttribute("src") ?? "")).toContain(
      "cutouts/takoyaki-pawsome-balls.webp",
    );
  });

  it("TC-P4-142 — if the 3D stage fails the dialog falls back to the photo", async () => {
    three.fail = true;
    renderCard(matcha);
    const dialog = await openOrder(matcha);
    expect(
      await within(dialog).findByAltText(MATCHA_PHOTO),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByTestId("menu-stage-canvas"),
    ).not.toBeInTheDocument();
  });

  it("TC-P4-143 — sold-out items show their photo, have no Order button and open no dialog", () => {
    renderCard(soldOutOreo);
    expect(screen.queryByTestId("menu-stage-canvas")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `Order ${soldOutOreo.name}` }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Temporarily unavailable")).toBeInTheDocument();
  });

  it("TC-P4-148 — a flavor with a photo floats its cut-out; the others float a built model", async () => {
    renderCard(matcha);
    const dialog = await openOrder(matcha);
    const first = await within(dialog).findByTestId("menu-stage-canvas");
    expect(first.getAttribute("data-model")).not.toContain("cutout");

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Vanilla Matcha Meow" }),
    );
    const cut = await within(dialog).findByTestId("menu-stage-canvas");
    expect(cut.getAttribute("data-model")).toContain("cutout");
    expect(cut.getAttribute("data-model")).toContain(
      "vanilla-matcha-meow.webp",
    );
    expect(getMenuCutout(matcha.name, "Vanilla Matcha Meow")?.src).toBe(
      "/images/menu/items/cutouts/vanilla-matcha-meow.webp",
    );
    expect(getMenuCutout(mystery.name)).toBeNull();
  });

  it("TC-P4-051 — the order dialog only takes presets that are the item's own options", () => {
    const valid = render(
      <CartProvider storageKey="test_menu_viewer_storage">
        <MenuItemOrderDialog
          item={matcha}
          initialVariantId="matcha-16oz"
          initialFlavor="Caramel Matcha Tail"
          onClose={vi.fn()}
        />
      </CartProvider>,
    );
    let order = screen.getByRole("dialog", { name: matcha.name });
    expect(
      within(order).getByRole("button", { name: /^16oz/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(order).getByRole("button", { name: "Caramel Matcha Tail" }),
    ).toHaveAttribute("aria-pressed", "true");
    valid.unmount();

    render(
      <CartProvider storageKey="test_menu_viewer_storage">
        <MenuItemOrderDialog
          item={matcha}
          initialVariantId="espresso-99oz"
          initialFlavor="Bubblegum"
          onClose={vi.fn()}
        />
      </CartProvider>,
    );
    order = screen.getByRole("dialog", { name: matcha.name });
    expect(
      within(order).getByRole("button", { name: /^12oz/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(order).getByRole("button", { name: "No flavor / Standard" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
