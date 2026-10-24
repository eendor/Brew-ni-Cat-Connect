import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutView } from "@/components/checkout/checkout-view";
import { CartProvider, useCart } from "@/context/cart-context";
import { PLACE_ORDER_MESSAGES } from "@/lib/orders/place-order";
import {
  isTrackingToken,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from "@/lib/orders/types";
import type { MenuCatalog } from "@/types/menu";
import type { CartState } from "@/types/ordering";

const routerPush = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REFERENCE = "BNC-7K2Q9F";

const cart: CartState = {
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

/** The menu after the latte went from ₱95 to ₱105. */
const repricedMenu: MenuCatalog = {
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
              basePrice: 105,
              flavorPrices: [],
              description: null,
            },
          ],
        },
        {
          id: "takoyaki",
          name: "Takoyaki",
          availability: "available",
          flavors: ["Veggie"],
          variants: [
            {
              id: "tako-4",
              name: "4 pcs",
              basePrice: 45,
              flavorPrices: [],
              description: null,
            },
          ],
        },
      ],
    },
  ],
};

function CartCount() {
  const { itemCount } = useCart();
  return <span data-testid="cart-count">{itemCount}</span>;
}

type Options = Readonly<{
  submitOrder: (request: PlaceOrderRequest) => Promise<PlaceOrderResult>;
  openOrder?: (path: string) => void;
  loadMenu?: () => Promise<MenuCatalog>;
  onlineOrdering?: boolean;
}>;

function renderCheckout(options: Options) {
  return render(
    <CartProvider initialState={cart} storageKey="place_order_test">
      <CheckoutView
        onlineOrdering={options.onlineOrdering ?? true}
        submitOrder={options.submitOrder}
        openOrder={options.openOrder}
        loadMenu={options.loadMenu ?? (() => new Promise(() => {}))}
      />
      <CartCount />
    </CartProvider>,
  );
}

async function reachReview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full Name/i), "Pedro Penduko");
  await user.type(
    screen.getByLabelText(/Contact Phone Number/i),
    "0927 987 6543",
  );
  await user.click(
    screen.getByRole("button", { name: /Continue to Order Review/i }),
  );
}

function placed(request: PlaceOrderRequest): PlaceOrderResult {
  return {
    ok: true,
    reference: REFERENCE,
    trackingToken: request.trackingToken,
    status: "pending",
    createdAt: "2026-10-24T08:00:00.000Z",
  };
}

function requestAt(
  submitOrder: ReturnType<typeof vi.fn<Options["submitOrder"]>>,
  call: number,
): PlaceOrderRequest {
  const request = submitOrder.mock.calls[call]?.[0];
  if (!request) throw new Error(`Place order was not sent ${call + 1} times`);
  return request;
}

describe("Place order at checkout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    routerPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TC-P4-094 — pickup sends what the customer picked, empties the cart and opens the order", async () => {
    const submitOrder = vi.fn<Options["submitOrder"]>(async (request) =>
      placed(request),
    );
    const openOrder = vi.fn();
    renderCheckout({ submitOrder, openOrder });
    const user = userEvent.setup();
    await reachReview(user);

    expect(
      screen.queryByRole("button", { name: /Proceed to Send to Shop/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => expect(openOrder).toHaveBeenCalledTimes(1));
    const request = requestAt(submitOrder, 0);
    // names and quantities only: the database prices every line
    expect(request).toEqual({
      idempotencyKey: expect.stringMatching(UUID_V4),
      trackingToken: expect.any(String),
      fulfillment: "pickup",
      customer: {
        name: "Pedro Penduko",
        phone: "0927 987 6543",
        notes: "",
        paymentPreference: "Cash",
      },
      lines: [
        {
          itemId: "iced-caramel",
          variantId: "latte-16",
          flavor: "Caramel",
          quantity: 2,
        },
        {
          itemId: "takoyaki",
          variantId: "tako-4",
          flavor: "Veggie",
          quantity: 1,
        },
      ],
      expectedSubtotal: 235,
    });
    expect(isTrackingToken(request.trackingToken)).toBe(true);

    const path = `/orders/${REFERENCE}#token=${request.trackingToken}`;
    expect(openOrder).toHaveBeenCalledWith(path);
    expect(
      screen.getByRole("heading", { level: 1, name: "Order placed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View your order" }),
    ).toHaveAttribute("href", path);
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("TC-P4-095 — the order page opens with client-side navigation by default", async () => {
    const submitOrder = vi.fn<Options["submitOrder"]>(async (request) =>
      placed(request),
    );
    renderCheckout({ submitOrder });
    const user = userEvent.setup();
    await reachReview(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledTimes(1));
    expect(routerPush).toHaveBeenCalledWith(
      `/orders/${REFERENCE}#token=${requestAt(submitOrder, 0).trackingToken}`,
    );
  });

  it("TC-P4-096 — rider delivery keeps the copied summary", async () => {
    const submitOrder = vi.fn<Options["submitOrder"]>();
    renderCheckout({ submitOrder });
    const user = userEvent.setup();

    await user.click(screen.getByRole("radio", { name: /Rider Delivery/i }));
    await user.type(screen.getByLabelText(/Delivery Address/i), "Purok 1");
    await reachReview(user);

    expect(
      screen.getByRole("button", { name: /Proceed to Send to Rider/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Place order" }),
    ).not.toBeInTheDocument();
    expect(submitOrder).not.toHaveBeenCalled();
  });

  it("TC-P4-097 — with online ordering off, pickup keeps the copied summary", async () => {
    const submitOrder = vi.fn<Options["submitOrder"]>();
    renderCheckout({ submitOrder, onlineOrdering: false });
    const user = userEvent.setup();
    await reachReview(user);

    expect(
      screen.getByRole("button", { name: /Proceed to Send to Shop/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Place order" }),
    ).not.toBeInTheDocument();
  });

  it("TC-P4-098 — a retry after a failure sends the same key and token", async () => {
    const submitOrder = vi
      .fn<Options["submitOrder"]>()
      .mockResolvedValueOnce({
        ok: false,
        reason: "server-error",
        message: PLACE_ORDER_MESSAGES["server-error"],
      })
      .mockImplementation(async (request) => placed(request));
    const openOrder = vi.fn();
    renderCheckout({ submitOrder, openOrder });
    const user = userEvent.setup();
    await reachReview(user);

    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't place your order. Please try again.",
    );
    expect(screen.getByTestId("cart-count")).toHaveTextContent("3");

    await user.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(openOrder).toHaveBeenCalledTimes(1));
    const first = requestAt(submitOrder, 0);
    const second = requestAt(submitOrder, 1);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.trackingToken).toBe(first.trackingToken);
  });

  it("TC-P4-099 — a double tap sends one request", async () => {
    let finish: (result: PlaceOrderResult) => void = () => {};
    const submitOrder = vi.fn<Options["submitOrder"]>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const openOrder = vi.fn();
    renderCheckout({ submitOrder, openOrder });
    await reachReview(userEvent.setup());

    const button = screen.getByRole("button", { name: "Place order" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(submitOrder).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Placing order…" }),
    ).toBeDisabled();

    finish(placed(requestAt(submitOrder, 0)));
    await waitFor(() => expect(openOrder).toHaveBeenCalledTimes(1));
  });

  it("TC-P4-100 — a changed price shows the new subtotal and the next try orders at it", async () => {
    const submitOrder = vi
      .fn<Options["submitOrder"]>()
      .mockResolvedValueOnce({
        ok: false,
        reason: "price-changed",
        message: PLACE_ORDER_MESSAGES["price-changed"],
        subtotal: 255,
      })
      .mockImplementation(async (request) => placed(request));
    const loadMenu = vi
      .fn<() => Promise<MenuCatalog>>()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue(repricedMenu);
    const openOrder = vi.fn();
    renderCheckout({ submitOrder, loadMenu, openOrder });
    const user = userEvent.setup();
    await reachReview(user);

    await user.click(screen.getByRole("button", { name: "Place order" }));
    const notice = await screen.findByText(
      PLACE_ORDER_MESSAGES["price-changed"],
    );
    expect(notice.closest("[role=alert]")).toHaveTextContent(
      "New subtotal: ₱255",
    );
    // the cart is refreshed from the menu, so the review shows the new price
    await waitFor(() => expect(loadMenu).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("₱255")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(openOrder).toHaveBeenCalledTimes(1));
    const first = requestAt(submitOrder, 0);
    const second = requestAt(submitOrder, 1);
    expect(first.expectedSubtotal).toBe(235);
    expect(second.expectedSubtotal).toBe(255);
    // a different order, so a new key: nothing was saved under the first
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it("TC-P4-101 — an item the shop can't make names the item", async () => {
    const submitOrder = vi.fn<Options["submitOrder"]>().mockResolvedValue({
      ok: false,
      reason: "line-unavailable",
      message: PLACE_ORDER_MESSAGES["line-unavailable"],
      lines: [{ index: 1, reason: "item-unavailable" }],
    });
    renderCheckout({ submitOrder });
    const user = userEvent.setup();
    await reachReview(user);

    await user.click(screen.getByRole("button", { name: "Place order" }));
    const notice = await screen.findByText(
      PLACE_ORDER_MESSAGES["line-unavailable"],
    );
    expect(notice.closest("[role=alert]")).toHaveTextContent(
      "Takoyaki (4 pcs, Veggie): That product is temporarily unavailable.",
    );
    expect(screen.getByTestId("cart-count")).toHaveTextContent("3");
  });

  it("TC-P4-102 — details the shop's system refuses go back to the form", async () => {
    const submitOrder = vi.fn<Options["submitOrder"]>().mockResolvedValue({
      ok: false,
      reason: "invalid-details",
      message: PLACE_ORDER_MESSAGES["invalid-details"],
      fieldErrors: {
        notes: "Please keep your notes to 500 characters or fewer.",
      },
    });
    renderCheckout({ submitOrder });
    const user = userEvent.setup();
    await reachReview(user);

    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(
      await screen.findByText(
        "Please keep your notes to 500 characters or fewer.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Special Instructions/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
