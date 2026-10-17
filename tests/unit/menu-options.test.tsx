import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CartPageView } from "@/components/cart/cart-page-view";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { CartProvider } from "@/context/cart-context";
import { formatOptionName } from "@/lib/menu/format-name";
import type { MenuItem } from "@/types/menu";

const nachos: MenuItem = {
  id: "nachos",
  name: "Nachos (Kitty Litter Crisps)",
  availability: "available",
  flavors: [],
  variants: [
    {
      id: "nachos-veggies-meat",
      name: "Nachos+Veggies+Meat",
      basePrice: 99,
      flavorPrices: [],
      description: null,
    },
    {
      id: "nachos-fries-meat",
      name: "Nachos+Fries+Meat",
      basePrice: 119,
      flavorPrices: [],
      description: null,
    },
    {
      id: "nachos-all",
      name: "Nachos+Fries+Meat+Veggies",
      basePrice: 129,
      flavorPrices: [],
      description: null,
    },
  ],
};

describe("Menu option names and states (TC-P4-020, TC-P4-021)", () => {
  it("TC-P4-020 — joined option names read with spaces and long ones are full-width rows in the order dialog", async () => {
    expect(formatOptionName("Nachos+Fries+Meat")).toBe("Nachos + Fries + Meat");
    expect(formatOptionName("  Fries +Meat+  Veggies ")).toBe(
      "Fries + Meat + Veggies",
    );
    expect(formatOptionName("16 oz")).toBe("16 oz");

    const user = userEvent.setup();
    render(
      <CartProvider>
        <MenuItemCard item={nachos} />
      </CartProvider>,
    );
    // the card lists the readable names
    expect(screen.getByText("Nachos + Fries + Meat + Veggies")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: "Order Nachos (Kitty Litter Crisps)",
      }),
    );
    const dialog = screen.getByRole("dialog");
    const sizes = within(dialog).getByRole("group", {
      name: "Choose Size / Option",
    });
    const options = within(sizes).getAllByRole("button");
    expect(options).toHaveLength(3);
    // long names: one option per row, never three narrow columns
    expect(options[0]!.parentElement!.className).not.toMatch(/grid-cols/);
    expect(
      within(dialog).getByRole("button", { name: /Nachos \+ Veggies \+ Meat/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("TC-P4-021 — without WebGL the empty cart keeps its static icon instead of the 3D cup", () => {
    const { container } = render(
      <CartProvider>
        <CartPageView />
      </CartProvider>,
    );
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    const scene = container.querySelector(".state-scene");
    expect(scene).not.toBeNull();
    expect(scene).toHaveAttribute("aria-hidden", "true");
    expect(scene?.querySelector("canvas")).toBeNull();
    expect(scene?.querySelector("svg")).not.toBeNull();
  });
});
