import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartPageView } from "@/components/cart/cart-page-view";
import { CartTriggerButton } from "@/components/cart/cart-trigger-button";
import { CartProvider, useCart } from "@/context/cart-context";
import type { CartState } from "@/types/ordering";

const populatedState: CartState = {
  lines: [
    {
      key: "spanish-latte::spanish-16::",
      itemId: "spanish-latte",
      itemName: "Spanish Latte",
      variantId: "spanish-16",
      variantName: "16 oz",
      flavor: null,
      unitPrice: 90,
      quantity: 2,
      lineTotal: 180,
    },
    {
      key: "matcha::matcha-22::Strawberry",
      itemId: "matcha",
      itemName: "Matcha Latte",
      variantId: "matcha-22",
      variantName: "22 oz",
      flavor: "Strawberry",
      unitPrice: 110,
      quantity: 1,
      lineTotal: 110,
    },
  ],
  fulfillment: "pickup",
};

function CartConsumerDrawer() {
  const { openDrawer } = useCart();
  return (
    <>
      <button type="button" onClick={openDrawer}>
        Open Drawer
      </button>
      <CartDrawer />
    </>
  );
}

function renderWithCart(
  ui: ReactNode,
  initialState?: CartState,
  storageKey = "test_cart_components",
) {
  return render(
    <CartProvider initialState={initialState} storageKey={storageKey}>
      {ui}
    </CartProvider>,
  );
}

describe("CartDrawer Component", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("is hidden initially and opens when triggered", async () => {
    const user = userEvent.setup();
    renderWithCart(<CartConsumerDrawer />, populatedState);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Drawer" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Your Order")).toBeInTheDocument();
    expect(within(dialog).getByText("3 items")).toBeInTheDocument();
  });

  it("closes with the close button and with the Escape key", async () => {
    const user = userEvent.setup();
    renderWithCart(<CartConsumerDrawer />, populatedState);

    await user.click(screen.getByRole("button", { name: "Open Drawer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Reopen and close via button
    await user.click(screen.getByRole("button", { name: "Open Drawer" }));
    await user.click(screen.getByRole("button", { name: "Close cart drawer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders an accessible empty state with browse menu link", async () => {
    const user = userEvent.setup();
    renderWithCart(<CartConsumerDrawer />); // empty cart

    await user.click(screen.getByRole("button", { name: "Open Drawer" }));

    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });

  it("displays line items, quantity controls, line totals, and subtotal", async () => {
    const user = userEvent.setup();
    renderWithCart(<CartConsumerDrawer />, populatedState);

    await user.click(screen.getByRole("button", { name: "Open Drawer" }));

    expect(screen.getByText("Spanish Latte")).toBeInTheDocument();
    expect(screen.getByText("Matcha Latte")).toBeInTheDocument();
    expect(screen.getByText(/Flavor: Strawberry/)).toBeInTheDocument();
    expect(screen.getAllByText("₱180").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₱110").length).toBeGreaterThan(0);
    expect(screen.getByText("₱290")).toBeInTheDocument(); // subtotal: 180 + 110

    // Increase Spanish Latte quantity
    const increaseBtn = screen.getByRole("button", {
      name: "Increase quantity of Spanish Latte (16 oz)",
    });
    await user.click(increaseBtn);

    // Focus must stay on the increase button instead of jumping back to close drawer button
    expect(document.activeElement).toBe(increaseBtn);

    // Subtotal should now be 90*3 + 110 = 380
    expect(screen.getByText("₱380")).toBeInTheDocument();

    // Remove Spanish Latte
    const removeBtn = screen.getByRole("button", {
      name: "Remove Spanish Latte (16 oz) from cart",
    });
    await user.click(removeBtn);

    expect(screen.queryByText("Spanish Latte")).not.toBeInTheDocument();
    expect(screen.getAllByText("₱110").length).toBeGreaterThan(0);
  });

  it("navigates to checkout and cart page", async () => {
    const user = userEvent.setup();
    renderWithCart(<CartConsumerDrawer />, populatedState);

    await user.click(screen.getByRole("button", { name: "Open Drawer" }));

    const checkoutLink = screen.getByRole("link", {
      name: "Proceed to Checkout",
    });
    expect(checkoutLink).toHaveAttribute("href", "/checkout");

    const fullCartLink = screen.getByRole("link", {
      name: "View Full Cart Page",
    });
    expect(fullCartLink).toHaveAttribute("href", "/cart");
  });
});

describe("CartPageView Component", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders empty state when cart has no lines", () => {
    renderWithCart(<CartPageView />);

    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore Current Menu" }),
    ).toHaveAttribute("href", "/menu");
  });

  it("renders cart lines, fulfillment selector, and order summary", async () => {
    const user = userEvent.setup();
    renderWithCart(<CartPageView />, populatedState);

    expect(screen.getByText("Spanish Latte")).toBeInTheDocument();
    expect(screen.getByText("Matcha Latte")).toBeInTheDocument();
    expect(screen.getByText("₱290")).toBeInTheDocument();

    // Check fulfillment radio options
    const pickupRadio = screen.getByRole("radio", {
      name: /Pickup at Shop/i,
    });
    const riderRadio = screen.getByRole("radio", {
      name: /Customer-Arranged Rider/i,
    });

    expect(pickupRadio).toBeChecked();
    expect(riderRadio).not.toBeChecked();

    // Switch to external rider
    await user.click(riderRadio);
    expect(riderRadio).toBeChecked();
    expect(screen.getByText("Rider Arrangement Notice")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Brew ni Cat does not calculate, book, or collect rider fees/i,
      ),
    ).toBeInTheDocument();
  });

  it("clears cart lines from cart page", async () => {
    const user = userEvent.setup();
    renderWithCart(<CartPageView />, populatedState);

    expect(screen.getByText("Spanish Latte")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear cart" }));

    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });
});

describe("CartTriggerButton Component", () => {
  it("renders empty state label when no items", () => {
    renderWithCart(<CartTriggerButton />);

    const button = screen.getByRole("button", {
      name: "Open cart (empty)",
    });
    expect(button).toBeInTheDocument();
  });

  it("renders badge and item count label when items are in cart", () => {
    renderWithCart(<CartTriggerButton />, populatedState);

    const button = screen.getByRole("button", {
      name: "Open cart (3 items)",
    });
    expect(button).toBeInTheDocument();
    expect(within(button).getByText("3")).toBeInTheDocument();
  });
});
