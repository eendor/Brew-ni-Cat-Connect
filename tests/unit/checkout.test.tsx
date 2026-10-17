import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CheckoutView } from "@/components/checkout/checkout-view";
import { CartProvider } from "@/context/cart-context";
import type { MenuCatalog } from "@/types/menu";
import type { CartState } from "@/types/ordering";

const testCartState: CartState = {
  lines: [
    {
      key: "iced-caramel::latte-16::Caramel",
      itemId: "iced-caramel",
      itemName: "Iced Caramel Latte",
      variantId: "latte-16",
      variantName: "16 oz",
      flavor: "Caramel",
      unitPrice: 95,
      quantity: 2,
      lineTotal: 190,
    },
    {
      key: "takoyaki::tako-4::Veggie",
      itemId: "takoyaki",
      itemName: "Takoyaki",
      variantId: "tako-4",
      variantName: "4 pcs",
      flavor: "Veggie",
      unitPrice: 45,
      quantity: 1,
      lineTotal: 45,
    },
  ],
  fulfillment: "pickup",
};

function renderCheckout(
  initialState?: CartState,
  storageKey = "test_checkout_storage",
  loadMenu?: () => Promise<MenuCatalog>,
) {
  return render(
    <CartProvider initialState={initialState} storageKey={storageKey}>
      <CheckoutView loadMenu={loadMenu} />
    </CartProvider>,
  );
}

describe("Checkout Flow & Step Transitions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("TC-P3-CHK-001 — renders empty cart notice when user opens checkout without items", () => {
    renderCheckout(); // empty initial state

    expect(
      screen.getByRole("heading", { level: 2, name: "Your cart is empty" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });

  it("TC-P3-CHK-002 — renders Step 1 (Details & Fulfillment) with order summary from pricing helpers", () => {
    renderCheckout(testCartState);

    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "1. Select Fulfillment Mode",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "2. Customer Contact Information",
      }),
    ).toBeInTheDocument();

    // Summary displays subtotal (190 + 45 = 235)
    expect(screen.getByText("₱235")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0); // total items: 2 + 1
  });

  it("TC-P3-CHK-003 — switches between Pickup and Customer-Arranged Rider with current business wording", async () => {
    const user = userEvent.setup();
    renderCheckout(testCartState);

    const pickupRadio = screen.getByRole("radio", {
      name: /Pickup at Shop/i,
    });
    const riderRadio = screen.getByRole("radio", {
      name: /Customer-Arranged Rider/i,
    });

    expect(pickupRadio).toBeChecked();
    expect(riderRadio).not.toBeChecked();

    // Select customer-arranged rider
    await user.click(riderRadio);
    expect(riderRadio).toBeChecked();

    // Check business wording
    expect(
      screen.getByText("How External Rider Pickup Works:"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Prepare your order summary through this page."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Contact and book your external rider yourself/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Rider availability, delivery fees, arrival time, and rider payment are separate from Brew ni Cat/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /The shop does not calculate, book, or charge rider fees/i,
      ),
    ).toBeInTheDocument();
  });

  it("TC-P3-CHK-004 — validates required contact fields before allowing transition to review", async () => {
    const user = userEvent.setup();
    renderCheckout(testCartState);

    const submitBtn = screen.getByRole("button", {
      name: /Continue to Order Review/i,
    });

    // Attempt submit with empty fields
    await user.click(submitBtn);

    expect(
      screen.getByText("Please enter your full name."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please enter your contact phone number."),
    ).toBeInTheDocument();

    // Fill in invalid phone
    const nameInput = screen.getByLabelText(/Full Name/i);
    const phoneInput = screen.getByLabelText(/Contact Phone Number/i);

    await user.type(nameInput, "Juan Dela Cruz");
    await user.type(phoneInput, "1234");
    await user.click(submitBtn);

    expect(
      screen.getByText(/Please enter a valid Philippine mobile number/i),
    ).toBeInTheDocument();

    // Verify rejection of alphabetic characters (e.g. abcdefghij)
    await user.clear(phoneInput);
    await user.type(phoneInput, "abcdefghij");
    await user.click(submitBtn);
    expect(
      screen.getByText(/Please enter a valid Philippine mobile number/i),
    ).toBeInTheDocument();
  });

  it("TC-P3-CHK-005 & TC-P3-CHK-006 — transitions to Step 2 (Order Review) with itemized snapshot and allows editing", async () => {
    const user = userEvent.setup();
    renderCheckout(testCartState);

    const nameInput = screen.getByLabelText(/Full Name/i);
    const phoneInput = screen.getByLabelText(/Contact Phone Number/i);
    const notesInput = screen.getByLabelText(/Special Instructions/i);

    await user.type(nameInput, "Maria Clara");
    await user.type(phoneInput, "09181234567");
    await user.type(notesInput, "Please pack separately.");

    await user.click(
      screen.getByRole("button", { name: /Continue to Order Review/i }),
    );

    // Now in Step 2: Review Order
    expect(
      screen.getByRole("heading", { level: 1, name: "Review Order" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Review Items" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Fulfillment & Customer Details",
      }),
    ).toBeInTheDocument();

    // Verify items in review list
    expect(screen.getByText("Iced Caramel Latte")).toBeInTheDocument();
    expect(screen.getByText("Takoyaki")).toBeInTheDocument();
    expect(screen.getAllByText("₱190").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₱45").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₱235").length).toBeGreaterThan(0);

    // Verify customer info in review list
    expect(screen.getByText("Maria Clara")).toBeInTheDocument();
    expect(screen.getByText("09181234567")).toBeInTheDocument();
    expect(screen.getByText("Please pack separately.")).toBeInTheDocument();
    expect(
      screen.getByText(/Cash at counter|GCash at counter/i),
    ).toBeInTheDocument();

    // Click Edit Details to return to Step 1
    const editDetailsBtn = screen.getByRole("button", {
      name: "Edit details",
    });
    await user.click(editDetailsBtn);

    // Back in Step 1, inputs preserved
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Maria Clara");
    expect(screen.getByLabelText(/Contact Phone Number/i)).toHaveValue(
      "09181234567",
    );
  });

  it("TC-P3-CHK-007 & TC-P3-CHK-008 — transitions to Step 3 (Send to Shop) without claiming backend order persistence", async () => {
    const user = userEvent.setup();
    renderCheckout(testCartState);

    await user.type(screen.getByLabelText(/Full Name/i), "Pedro Penduko");
    await user.type(
      screen.getByLabelText(/Contact Phone Number/i),
      "09279876543",
    );

    await user.click(
      screen.getByRole("button", { name: /Continue to Order Review/i }),
    );

    // In Review step, proceed to Send to Shop
    const proceedBtn = screen.getByRole("button", {
      name: /Proceed to Send to Shop/i,
    });
    await user.click(proceedBtn);

    // Step 3: Order Summary for the Shop
    expect(
      screen.getByRole("heading", { level: 1, name: "Order Summary for Shop" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Order Summary Ready")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Order Summary for the Shop",
      }),
    ).toBeInTheDocument();

    // Notice that no backend order was placed
    expect(
      screen.getByText(/The website does not transmit orders to the shop yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No order has been sent to Brew ni Cat/i),
    ).toBeInTheDocument();

    // Formatted summary and copy button
    expect(
      screen.getByRole("button", { name: /Copy order summary/i }),
    ).toBeInTheDocument();

    // Direct shop contact action links
    expect(
      screen.getByRole("link", { name: "Message on Facebook" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Call or Text/i }),
    ).toBeInTheDocument();

    // CTAs
    expect(
      screen.getByRole("link", { name: "Start a new order" }),
    ).toHaveAttribute("href", "/menu");

    // The summary survives a refresh and the cart is kept until the summary
    // is copied or a new order is started
    expect(
      window.localStorage.getItem("brew-ni-cat:prepared-summary"),
    ).toContain("Iced Caramel Latte");
    expect(
      screen.getByText(/Takeout box: ₱10, not included in the subtotal/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to Home" }),
    ).toHaveAttribute("href", "/");
  });

  it("TC-P3-CHK-009 — revalidates cart prices against menu catalog on mount to prevent tampering", async () => {
    const mockCatalog: MenuCatalog = {
      categories: [
        {
          id: "drinks",
          name: "Drinks",
          items: [
            {
              id: "iced-caramel",
              name: "Iced Caramel Latte",
              availability: "available",
              flavors: ["Caramel"],
              variants: [
                {
                  id: "latte-16",
                  name: "16 oz",
                  basePrice: 95,
                  flavorPrices: [],
                  description: null,
                },
              ],
            },
          ],
        },
      ],
    };

    // Tampered cart state with unitPrice: 1
    const tamperedCartState: CartState = {
      lines: [
        {
          key: "iced-caramel::latte-16::Caramel",
          itemId: "iced-caramel",
          itemName: "Iced Caramel Latte",
          variantId: "latte-16",
          variantName: "16 oz",
          flavor: "Caramel",
          unitPrice: 1, // Tampered from 95
          quantity: 1,
          lineTotal: 1,
        },
      ],
      fulfillment: "pickup",
    };

    renderCheckout(tamperedCartState, "tampered_cart_test", () =>
      Promise.resolve(mockCatalog),
    );

    // The subtotal should revalidate to ₱95, not ₱1
    expect(await screen.findByText("₱95")).toBeInTheDocument();
  });
});
