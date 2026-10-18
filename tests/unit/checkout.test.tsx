import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutView } from "@/components/checkout/checkout-view";
import { siteConfig } from "@/config/site";
import { CartProvider, useCart } from "@/context/cart-context";
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

const SUMMARY_KEY = "brew-ni-cat:prepared-summary";

/** Shows the live cart size so tests can tell whether the cart was cleared. */
function CartCount() {
  const { itemCount } = useCart();
  return <span data-testid="cart-count">{itemCount}</span>;
}

function renderCheckout(
  initialState?: CartState,
  storageKey = "test_checkout_storage",
  loadMenu?: () => Promise<MenuCatalog>,
) {
  return render(
    <CartProvider initialState={initialState} storageKey={storageKey}>
      <CheckoutView loadMenu={loadMenu} />
      <CartCount />
    </CartProvider>,
  );
}

/** Fills the details step and walks through to the final summary step. */
async function reachSendStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full Name/i), "Pedro Penduko");
  await user.type(
    screen.getByLabelText(/Contact Phone Number/i),
    "09279876543",
  );
  await user.click(
    screen.getByRole("button", { name: /Continue to Order Review/i }),
  );
  await user.click(
    screen.getByRole("button", { name: /Proceed to Send to Shop/i }),
  );
}

/** A stored summary as the checkout writes it, for refresh scenarios. */
function storeSummary(
  overrides: Readonly<{ savedAt?: number; summary?: unknown }> = {},
) {
  window.sessionStorage.setItem(
    SUMMARY_KEY,
    JSON.stringify({
      savedAt: overrides.savedAt ?? Date.now(),
      summary: overrides.summary ?? {
        createdAt: "08:15 PM",
        customer: {
          name: "Maria Clara",
          phone: "09181234567",
          notes: "",
          paymentPreference: "Cash",
        },
        fulfillment: testCartState.fulfillment,
        lines: testCartState.lines,
        subtotal: 235,
        itemCount: 3,
      },
    }),
  );
}

describe("Checkout Flow & Step Transitions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("TC-P3-CHK-003 — switches between Pickup at Shop and Rider Delivery with the rider wording", async () => {
    const user = userEvent.setup();
    renderCheckout(testCartState);

    const pickupRadio = screen.getByRole("radio", {
      name: /Pickup at Shop/i,
    });
    const riderRadio = screen.getByRole("radio", {
      name: /Rider Delivery/i,
    });

    expect(pickupRadio).toBeChecked();
    expect(riderRadio).not.toBeChecked();
    expect(
      screen.getByRole("group", { name: "Payment Preference at Shop" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Delivery Address/i)).toBeNull();

    await user.click(riderRadio);
    expect(riderRadio).toBeChecked();

    expect(screen.getByText("How Rider Delivery Works:")).toBeInTheDocument();
    expect(
      screen.getByText("Prepare your order summary on this page."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/send it to one of the local riders listed there/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Delivery fee, timing and payment are agreed with your rider\. Brew ni Cat doesn.t book riders or charge rider fees\./,
      ),
    ).toBeInTheDocument();

    // the rider settles payment, so the shop payment choice is hidden and
    // the delivery address is asked for instead
    expect(
      screen.queryByRole("group", { name: /Payment Preference/i }),
    ).toBeNull();
    expect(screen.getByLabelText(/Delivery Address/i)).toBeRequired();
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

    // The summary survives a refresh of this tab (sessionStorage, never
    // localStorage, since it holds the name and phone) and the cart is kept
    // until the summary is copied or a new order is started
    expect(window.sessionStorage.getItem(SUMMARY_KEY)).toContain(
      "Iced Caramel Latte",
    );
    expect(window.localStorage.getItem(SUMMARY_KEY)).toBeNull();
    expect(screen.getByTestId("cart-count")).toHaveTextContent("3");
    expect(
      screen.getByText(/Takeout box: ₱10, not included in the subtotal/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to Home" }),
    ).toHaveAttribute("href", "/");
  });

  it("TC-P4-028 — rider delivery needs an address and ends with the rider list", async () => {
    const user = userEvent.setup();
    renderCheckout(testCartState);

    await user.click(screen.getByRole("radio", { name: /Rider Delivery/i }));
    await user.type(screen.getByLabelText(/Full Name/i), "Pedro Penduko");
    await user.type(
      screen.getByLabelText(/Contact Phone Number/i),
      "09279876543",
    );
    await user.click(
      screen.getByRole("button", { name: /Continue to Order Review/i }),
    );

    // no address yet: the step stays and focus goes to the field
    const addressInput = screen.getByLabelText(/Delivery Address/i);
    expect(
      screen.getByText("Please enter the delivery address for your rider."),
    ).toBeInTheDocument();
    await waitFor(() => expect(addressInput).toHaveFocus());

    await user.type(addressInput, "Purok 2, Poblacion, Kabacan");
    await user.click(
      screen.getByRole("button", { name: /Continue to Order Review/i }),
    );

    // the review shows where it goes and who settles payment
    expect(
      screen.getByRole("heading", { level: 1, name: "Review Order" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delivery Address")).toBeInTheDocument();
    expect(screen.getByText("Purok 2, Poblacion, Kabacan")).toBeInTheDocument();
    expect(screen.getByText("Agreed with your rider")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Proceed to Send to Rider/i }),
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Order Summary for Your Rider",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Order Summary for Your Rider",
      }),
    ).toBeInTheDocument();

    const summaryText = document.querySelector("pre")?.textContent ?? "";
    expect(summaryText).toContain("Fulfillment: Rider delivery");
    expect(summaryText).toContain(
      `Order and pick up at: ${siteConfig.shortName}, ${siteConfig.address.street}`,
    );
    expect(summaryText).toContain("Deliver to: Purok 2, Poblacion, Kabacan");
    expect(summaryText).toContain(
      "Payment and delivery fee: agreed with the rider",
    );
    expect(summaryText).not.toContain("Payment preference");

    // the next step is a rider, not the shop's own contact links
    const riders = within(
      screen.getByRole("list", { name: "Rider delivery services" }),
    ).getAllByRole("link");
    expect(riders).toHaveLength(siteConfig.externalRiders.length);
    expect(
      screen.queryByRole("link", { name: "Message on Facebook" }),
    ).toBeNull();
  });

  it("TC-P4-016 — a successful copy confirms it and clears the cart", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderCheckout(testCartState);
    await reachSendStep(user);

    await user.click(
      screen.getByRole("button", { name: /Copy order summary/i }),
    );

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Customer: Pedro Penduko"),
    );
    expect(
      await screen.findByRole("button", { name: "Copied to clipboard!" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/^Copied\./);
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    // the summary stays on screen for the call or message
    expect(
      screen.getByRole("heading", { level: 1, name: "Order Summary for Shop" }),
    ).toBeInTheDocument();
  });

  it("TC-P4-017 — a failed copy says so, selects the text and keeps the cart", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });
    renderCheckout(testCartState);
    await reachSendStep(user);
    // the step moves focus to its heading a moment after it renders; let
    // that settle so it can't land after the selection is made
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Order Summary for the Shop",
        }),
      ).toHaveFocus(),
    );

    // a plain click: user-event moves the text selection itself
    fireEvent.click(
      screen.getByRole("button", { name: /Copy order summary/i }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /Couldn’t copy automatically/,
    );
    expect(
      screen.getByRole("button", { name: /Copy order summary/i }),
    ).toBeInTheDocument();
    expect(window.getSelection()?.toString()).toContain(
      "Customer: Pedro Penduko",
    );
    expect(screen.getByTestId("cart-count")).toHaveTextContent("3");
  });

  it("TC-P4-018 — a stored summary only comes back while it is fresh, well formed and matches the cart", () => {
    // fresh and matching: a refresh lands back on the summary
    storeSummary();
    const fresh = renderCheckout(testCartState, "refresh_cart");
    expect(
      screen.getByRole("heading", { level: 1, name: "Order Summary for Shop" }),
    ).toBeInTheDocument();
    fresh.unmount();

    // older than 12 hours: ignored
    storeSummary({ savedAt: Date.now() - 13 * 60 * 60 * 1000 });
    const stale = renderCheckout(testCartState, "stale_cart");
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    stale.unmount();

    // not shaped like a summary: ignored instead of crashing the page
    storeSummary({ summary: { customer: null, lines: "oops" } });
    const broken = renderCheckout(testCartState, "broken_cart");
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    broken.unmount();

    // made from a different cart: dropped, and the visitor starts again
    storeSummary();
    renderCheckout(
      { ...testCartState, lines: testCartState.lines.slice(0, 1) },
      "changed_cart",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(SUMMARY_KEY)).toBeNull();
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
