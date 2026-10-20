import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuItemOrderDialog } from "@/components/menu/menu-item-order-dialog";
import { modelSpecFor } from "@/components/three/menu-models";
import { CartProvider } from "@/context/cart-context";
import type { MenuItem, MenuVariant } from "@/types/menu";

const three = vi.hoisted(() => ({ enabled: true, fail: false }));

vi.mock("@/components/three/use-three-enabled", () => ({
  useThreeEnabled: () => three.enabled,
}));

// jsdom has no WebGL: this stand-in canvas reports ready (or failed) the
// way the real one does and shows which model it was asked to build.
vi.mock("@/components/three/canvas/menu-viewer-canvas", async () => {
  const { createElement, useEffect } = await import("react");
  type Props = {
    spec: { key: string };
    onReady?: () => void;
    onError?: () => void;
  };
  function MockViewerCanvas({ spec, onReady, onError }: Props) {
    useEffect(() => {
      if (three.fail) onError?.();
      else onReady?.();
    }, [spec.key, onReady, onError]);
    return createElement("canvas", {
      "data-testid": "menu-viewer-canvas",
      "data-model": spec.key,
    });
  }
  return { default: MockViewerCanvas };
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

const sedaap: MenuItem = {
  id: "sedaap",
  name: "Sedaap Original",
  availability: "available",
  flavors: [],
  variants: [size("sedaap-regular", "Regular", 65)],
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
const DIRTY_NEKO_PHOTO =
  "Dirty Neko iced matcha with milk and an espresso layer on top";

function renderCard(item: MenuItem) {
  return render(
    <CartProvider storageKey="test_menu_viewer_storage">
      <MenuItemCard item={item} />
    </CartProvider>,
  );
}

/** The model the viewer should ask for. */
function modelKey(item: MenuItem, variantId: string, flavor?: string | null) {
  const variant = item.variants.find((entry) => entry.id === variantId);
  return modelSpecFor(item, variant, flavor)?.key;
}

async function openViewer(
  user: ReturnType<typeof userEvent.setup>,
  item: MenuItem,
) {
  await user.click(
    screen.getByRole("button", { name: `View ${item.name} in 3D` }),
  );
  const viewer = screen.getByRole("dialog", { name: item.name });
  await within(viewer).findByText(`3D model of ${item.name} ready`);
  return viewer;
}

const stage = () => document.querySelector(".menu-viewer__stage");

describe("Menu 3D viewer (TC-P4-044 – TC-P4-051)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    three.enabled = true;
    three.fail = false;
  });

  it("TC-P4-044 — a card with a 3D model offers View in 3D, which opens that model", async () => {
    const user = userEvent.setup();
    renderCard(matcha);
    // the photo card and its order button stay as they were
    expect(
      screen.getByRole("button", { name: `Order ${matcha.name}` }),
    ).toHaveAttribute("data-order-trigger");
    const view = screen.getByRole("button", {
      name: `View ${matcha.name} in 3D`,
    });
    expect(view).toHaveAttribute("aria-haspopup", "dialog");

    const viewer = await openViewer(user, matcha);
    expect(within(viewer).getByText("3D preview")).toBeInTheDocument();
    expect(
      within(viewer).getByRole("button", { name: "Close 3D preview" }),
    ).toHaveFocus();
    expect(within(viewer).getByTestId("menu-viewer-canvas")).toHaveAttribute(
      "data-model",
      modelKey(matcha, "matcha-12oz"),
    );
    expect(within(viewer).getByRole("status")).toHaveTextContent(
      `3D model of ${matcha.name} ready`,
    );
    expect(stage()).toHaveAttribute("data-state", "ready");
    // the real photo stays in view beside the model
    expect(
      within(viewer).getByRole("img", { name: MATCHA_PHOTO }),
    ).toBeInTheDocument();
    expect(within(viewer).getByTestId("menu-viewer-price")).toHaveTextContent(
      "₱49",
    );
    expect(
      within(viewer).getByRole("button", { name: "Standard" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("TC-P4-045 — size and flavor chips swap the model, price and photo in place", async () => {
    const user = userEvent.setup();
    renderCard(matcha);
    const viewer = await openViewer(user, matcha);
    const canvas = within(viewer).getByTestId("menu-viewer-canvas");
    const price = within(viewer).getByTestId("menu-viewer-price");

    await user.click(within(viewer).getByRole("button", { name: "22oz" }));
    expect(
      within(viewer).getByRole("button", { name: "22oz" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(viewer).getByRole("button", { name: "12oz" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(price).toHaveTextContent("₱79");
    expect(canvas).toHaveAttribute(
      "data-model",
      modelKey(matcha, "matcha-22oz", null),
    );

    await user.click(
      within(viewer).getByRole("button", { name: "Dirty Neko" }),
    );
    expect(canvas).toHaveAttribute(
      "data-model",
      modelKey(matcha, "matcha-22oz", "Dirty Neko"),
    );
    expect(
      within(viewer).getByRole("img", { name: DIRTY_NEKO_PHOTO }),
    ).toBeInTheDocument();
    expect(within(viewer).getByText("22oz · Dirty Neko")).toBeInTheDocument();

    await user.click(within(viewer).getByRole("button", { name: "Standard" }));
    expect(
      within(viewer).getByRole("img", { name: MATCHA_PHOTO }),
    ).toBeInTheDocument();
    // one scene for the whole visit: the canvas is reused, not rebuilt
    expect(within(viewer).getByTestId("menu-viewer-canvas")).toBe(canvas);
  });

  it("TC-P4-046 — Add to order opens the order dialog on the size and flavor picked in 3D", async () => {
    const user = userEvent.setup();
    renderCard(matcha);
    const viewer = await openViewer(user, matcha);
    await user.click(within(viewer).getByRole("button", { name: "22oz" }));
    await user.click(
      within(viewer).getByRole("button", { name: "Vanilla Matcha Meow" }),
    );
    await user.click(
      within(viewer).getByRole("button", {
        name: `Add ${matcha.name} to order`,
      }),
    );

    // the viewer has gone and the order dialog took its place
    expect(
      screen.queryByRole("button", { name: "Close 3D preview" }),
    ).not.toBeInTheDocument();
    const order = screen.getByRole("dialog", { name: matcha.name });
    expect(within(order).getByText("Configure item")).toBeInTheDocument();
    expect(
      within(order).getByRole("button", { name: /^22oz/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(order).getByRole("button", { name: /^12oz/ }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(order).getByRole("button", { name: "Vanilla Matcha Meow" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(order).getByRole("button", { name: "No flavor / Standard" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(order).getByText("Selection total").parentElement,
    ).toHaveTextContent("₱79");

    // closing the order gives focus back to where the guest started
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `View ${matcha.name} in 3D` }),
    ).toHaveFocus();

    // a plain Order click starts fresh, not on the last 3D pick
    await user.click(
      screen.getByRole("button", { name: `Order ${matcha.name}` }),
    );
    const fresh = screen.getByRole("dialog", { name: matcha.name });
    expect(
      within(fresh).getByRole("button", { name: /^12oz/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(fresh).getByRole("button", { name: "No flavor / Standard" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("TC-P4-047 — sizes priced per flavor open on their first flavor, with no Standard chip", async () => {
    const user = userEvent.setup();
    renderCard(takoyaki);
    const viewer = await openViewer(user, takoyaki);
    const canvas = within(viewer).getByTestId("menu-viewer-canvas");
    const price = within(viewer).getByTestId("menu-viewer-price");
    expect(
      within(viewer).queryByRole("button", { name: "Standard" }),
    ).not.toBeInTheDocument();
    expect(
      within(viewer).getByRole("button", { name: "Veggie Whiskers" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(price).toHaveTextContent("₱40");
    expect(canvas).toHaveAttribute("data-model", modelKey(takoyaki, "tako-4"));

    await user.click(within(viewer).getByRole("button", { name: "8pcs" }));
    expect(price).toHaveTextContent("₱80");
    await user.click(
      within(viewer).getByRole("button", { name: "Squid Treats" }),
    );
    expect(price).toHaveTextContent("₱110");
    expect(canvas).toHaveAttribute(
      "data-model",
      modelKey(takoyaki, "tako-8", "Squid Treats"),
    );

    await user.click(
      within(viewer).getByRole("button", {
        name: `Add ${takoyaki.name} to order`,
      }),
    );
    const order = screen.getByRole("dialog", { name: takoyaki.name });
    expect(
      within(order).getByRole("button", { name: /^8pcs/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(order).getByRole("button", { name: /^Squid Treats/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(order).getByText("Selection total").parentElement,
    ).toHaveTextContent("₱110");
  });

  it("TC-P4-048 — View in 3D needs WebGL and a model; sold-out items can be viewed, not ordered", async () => {
    const user = userEvent.setup();
    three.enabled = false;
    const plain = renderCard(matcha);
    expect(
      screen.queryByRole("button", { name: /in 3D$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Order ${matcha.name}` }),
    ).toBeInTheDocument();
    plain.unmount();

    three.enabled = true;
    const unknown = renderCard(mystery);
    expect(
      screen.queryByRole("button", { name: /in 3D$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Order Mystery Brew" }),
    ).toBeInTheDocument();
    unknown.unmount();

    renderCard(soldOutOreo);
    expect(
      screen.queryByRole("button", { name: `Order ${soldOutOreo.name}` }),
    ).not.toBeInTheDocument();
    const viewer = await openViewer(user, soldOutOreo);
    expect(
      within(viewer).getByRole("button", { name: "Vanilla Oreo Whisker" }),
    ).toBeInTheDocument();
    expect(
      within(viewer).queryByRole("button", { name: /to order$/ }),
    ).not.toBeInTheDocument();
  });

  it("TC-P4-049 — when the 3D model can't load, the viewer keeps the photo and says so", async () => {
    const user = userEvent.setup();
    three.fail = true;
    const first = renderCard(matcha);
    await user.click(
      screen.getByRole("button", { name: `View ${matcha.name} in 3D` }),
    );
    const viewer = screen.getByRole("dialog", { name: matcha.name });
    expect(
      await within(viewer).findByText(
        "3D preview unavailable, showing the photo",
      ),
    ).toBeInTheDocument();
    expect(
      within(viewer).queryByTestId("menu-viewer-canvas"),
    ).not.toBeInTheDocument();
    expect(stage()).toHaveAttribute("data-state", "failed");
    expect(
      within(viewer).getByRole("img", { name: MATCHA_PHOTO }),
    ).toBeInTheDocument();
    // the chips still change the photo, and ordering still works
    await user.click(
      within(viewer).getByRole("button", { name: "Dirty Neko" }),
    );
    expect(
      within(viewer).getByRole("img", { name: DIRTY_NEKO_PHOTO }),
    ).toBeInTheDocument();
    expect(
      within(viewer).getByRole("button", {
        name: `Add ${matcha.name} to order`,
      }),
    ).toBeEnabled();
    first.unmount();

    // an item without a photo just says the preview is unavailable
    renderCard(sedaap);
    await user.click(
      screen.getByRole("button", { name: `View ${sedaap.name} in 3D` }),
    );
    expect(
      await screen.findByText("3D preview unavailable"),
    ).toBeInTheDocument();
    expect(document.querySelector(".menu-viewer__photo")).toBeNull();
  });

  it("TC-P4-050 — Escape and the close button leave the viewer and return focus to View in 3D", async () => {
    const user = userEvent.setup();
    renderCard(matcha);
    const view = screen.getByRole("button", {
      name: `View ${matcha.name} in 3D`,
    });

    await openViewer(user, matcha);
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(view).toHaveFocus();
    expect(document.body.style.overflow).toBe("");

    const viewer = await openViewer(user, matcha);
    await user.click(
      within(viewer).getByRole("button", { name: "Close 3D preview" }),
    );
    // closing never opens the order dialog on its own
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(view).toHaveFocus();
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
