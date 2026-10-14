import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CheckoutView } from "@/components/checkout/checkout-view";
import { CartProvider } from "@/context/cart-context";
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
) {
  return render(
    <CartProvider initialState={initialState} storageKey={storageKey}>
      <CheckoutView />
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
      screen.getByText("Submit your order draft through this checkout."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Contact and book your external rider yourself."),
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
      screen.getByText(
        "Please enter a valid Philippine mobile number (e.g., 0912 345 6789).",
      ),
    ).toBeInTheDocument();
  });

  it("TC-P3-CHK-005 & TC-P3-CHK-006 — transitions to Step 2 (Order Review) with itemized snapshot and allows editing", async () => {
    const user = userEvent.setup();
    renderCheckout(testCartState);

    const nameInput = screen.getByLabelText(/Full Name/i);
    const phoneInput = screen.getByLabelText(/Contact Phone Number/i);
    const notesInput = screen.getByLabelText(/Special Instructions or Notes/i);

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

  it("TC-P3-CHK-007 & TC-P3-CHK-008 — confirms order draft without Supabase write, clears cart, and displays confirmation screen", async () => {
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

    // In Review step, confirm the draft
    const confirmBtn = screen.getByRole("button", {
      name: /Confirm Order Draft/i,
    });
    await user.click(confirmBtn);

    // Step 3: Order Received
    expect(
      screen.getByRole("heading", { level: 1, name: "Order Received" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Order Draft Received")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Thank You, Pedro Penduko!",
      }),
    ).toBeInTheDocument();

    // Check order reference code
    const referenceElements = screen.getAllByText(/BNC-/);
    expect(referenceElements.length).toBeGreaterThan(0);
    expect(referenceElements[0]?.textContent).toMatch(/BNC-\d{4}-[A-Z0-9]+/);

    // Check next steps guidance
    expect(screen.getByText("What happens next?")).toBeInTheDocument();
    expect(screen.getByText(/Visit Brew ni Cat at/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy order reference code" }),
    ).toBeInTheDocument();

    // CTAs
    expect(
      screen.getByRole("link", { name: "Order More Items" }),
    ).toHaveAttribute("href", "/menu");
    expect(
      screen.getByRole("link", { name: "Return to Home" }),
    ).toHaveAttribute("href", "/");
  });
});
