import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { CartProvider } from "@/context/cart-context";
import type { MenuCatalog, MenuItem } from "@/types/menu";

const sampleDrinkItem: MenuItem = {
  id: "iced-matcha",
  name: "Iced Matcha Latte",
  availability: "available",
  flavors: ["Original", "Strawberry"],
  variants: [
    {
      id: "matcha-16",
      name: "16 oz",
      basePrice: 85,
      flavorPrices: [{ flavor: "Strawberry", price: 95 }],
      description: null,
    },
    {
      id: "matcha-22",
      name: "22 oz",
      basePrice: 110,
      flavorPrices: [],
      description: null,
    },
  ],
};

const sampleSnackItem: MenuItem = {
  id: "takoyaki",
  name: "Takoyaki",
  availability: "available",
  flavors: ["Veggie", "Octopus"],
  variants: [
    {
      id: "tako-4",
      name: "4 pcs",
      basePrice: 0,
      flavorPrices: [
        { flavor: "Veggie", price: 40 },
        { flavor: "Octopus", price: 60 },
      ],
      description: null,
    },
  ],
};

const sampleUnavailableItem: MenuItem = {
  id: "sold-out-drink",
  name: "Sold Out Specialty",
  availability: "unavailable",
  flavors: [],
  variants: [
    {
      id: "special-16",
      name: "16 oz",
      basePrice: 120,
      flavorPrices: [],
      description: null,
    },
  ],
};

const sampleCatalog: MenuCatalog = {
  categories: [
    {
      id: "cat-1",
      name: "Featured",
      items: [sampleDrinkItem, sampleSnackItem, sampleUnavailableItem],
    },
  ],
};

function renderMenuItem(item: MenuItem) {
  return render(
    <CartProvider storageKey="test_menu_order_storage">
      <MenuItemCard item={item} catalog={sampleCatalog} />
      <CartDrawer />
    </CartProvider>,
  );
}

describe("MenuItemOrderDialog & MenuItemCard ordering integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders order button for available items but not for unavailable items", () => {
    const { unmount } = renderMenuItem(sampleDrinkItem);
    expect(
      screen.getByRole("button", { name: "Order Iced Matcha Latte" }),
    ).toBeInTheDocument();
    unmount();

    renderMenuItem(sampleUnavailableItem);
    expect(
      screen.queryByRole("button", { name: "Order Sold Out Specialty" }),
    ).not.toBeInTheDocument();
  });

  it("opens configuration dialog on click and displays options and live price", async () => {
    const user = userEvent.setup();
    renderMenuItem(sampleDrinkItem);

    await user.click(
      screen.getByRole("button", { name: "Order Iced Matcha Latte" }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", {
        level: 2,
        name: "Iced Matcha Latte",
      }),
    ).toBeInTheDocument();

    // Default variant 16 oz with ₱85
    expect(within(dialog).getAllByText("₱85").length).toBeGreaterThan(0);

    // Switch to 22 oz variant
    await user.click(within(dialog).getByRole("button", { name: /22 oz/i }));
    expect(within(dialog).getAllByText("₱110").length).toBeGreaterThan(0);
  });

  it("enforces flavor choice when variant base price is 0 placeholder", async () => {
    const user = userEvent.setup();
    renderMenuItem(sampleSnackItem);

    await user.click(screen.getByRole("button", { name: "Order Takoyaki" }));

    const dialog = screen.getByRole("dialog");
    const addBtn = within(dialog).getByRole("button", {
      name: "Add to Order",
    });

    // Try adding without selecting flavor
    await user.click(addBtn);
    expect(
      within(dialog).getByText(
        "Please choose a flavor to complete this selection.",
      ),
    ).toBeInTheDocument();

    // Select Veggie flavor (₱40)
    await user.click(within(dialog).getByRole("button", { name: /Veggie/i }));
    expect(within(dialog).getAllByText("₱40").length).toBeGreaterThan(0);

    // Now adding succeeds and opens cart drawer
    await user.click(addBtn);
    expect(
      screen.queryByRole("dialog", { name: /Configure/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Your Order")).toBeInTheDocument();
    expect(screen.getAllByText("Takoyaki").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Flavor: Veggie/)).toBeInTheDocument();
  });

  it("allows adjusting quantity and adds correct line total to cart", async () => {
    const user = userEvent.setup();
    renderMenuItem(sampleDrinkItem);

    await user.click(
      screen.getByRole("button", { name: "Order Iced Matcha Latte" }),
    );

    const dialog = screen.getByRole("dialog");

    // Increase quantity to 3
    const increaseBtn = within(dialog).getByRole("button", {
      name: "Increase quantity",
    });
    await user.click(increaseBtn);
    await user.click(increaseBtn);

    // 85 * 3 = 255
    expect(within(dialog).getByText("₱255")).toBeInTheDocument();

    // Add to order
    await user.click(
      within(dialog).getByRole("button", { name: "Add to Order" }),
    );

    // Drawer opens with 3 items totaling ₱255
    expect(screen.getByText("Your Order")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(screen.getAllByText("₱255").length).toBeGreaterThan(0);
  });

  it("keeps focus on selected option after click instead of resetting focus to close button", async () => {
    const user = userEvent.setup();
    renderMenuItem(sampleDrinkItem);

    await user.click(
      screen.getByRole("button", { name: "Order Iced Matcha Latte" }),
    );

    const dialog = screen.getByRole("dialog");
    const variant22Btn = within(dialog).getByRole("button", { name: /22 oz/i });

    await user.click(variant22Btn);

    // Focus must stay on the clicked option, not jump back to the close button
    expect(document.activeElement).toBe(variant22Btn);
  });

  it("TC-P4-011 — Add to Order uses the latest size, flavor and quantity on rapid clicks", async () => {
    const user = userEvent.setup();
    renderMenuItem(sampleDrinkItem);
    await user.click(
      screen.getByRole("button", { name: "Order Iced Matcha Latte" }),
    );
    const dialog = screen.getByRole("dialog");
    const size22 = within(dialog).getByRole("button", { name: /22 oz/i });
    const more = within(dialog).getByRole("button", {
      name: "Increase quantity",
    });
    const add = within(dialog).getByRole("button", { name: "Add to Order" });

    // All clicks land in one batch, before React re-renders the dialog, so
    // the Add handler from the first render would still see 16 oz × 1.
    // A second Add click in the same burst must not add the line twice.
    act(() => {
      size22.click();
      more.click();
      add.click();
      add.click();
    });

    const drawer = screen.getByRole("dialog", { name: /Your Order/ });
    expect(within(drawer).getByText("2 items")).toBeInTheDocument();
    expect(within(drawer).getAllByText(/22 oz/).length).toBeGreaterThan(0);
    expect(within(drawer).queryByText(/16 oz/)).not.toBeInTheDocument();
    expect(within(drawer).getAllByText("₱220").length).toBeGreaterThan(0);
  });

  it("TC-P4-012 — a flavor picked just before Add is the one added", async () => {
    const user = userEvent.setup();
    renderMenuItem(sampleSnackItem);
    await user.click(screen.getByRole("button", { name: "Order Takoyaki" }));
    const dialog = screen.getByRole("dialog");
    const octopus = within(dialog).getByRole("button", { name: /Octopus/i });
    const add = within(dialog).getByRole("button", { name: "Add to Order" });

    act(() => {
      octopus.click();
      add.click();
    });

    expect(screen.getByText(/Flavor: Octopus/)).toBeInTheDocument();
    expect(screen.getAllByText("₱60").length).toBeGreaterThan(0);
  });
});
