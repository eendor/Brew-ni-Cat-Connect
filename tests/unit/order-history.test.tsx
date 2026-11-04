import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderHistoryView } from "@/components/account/order-history-view";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import type {
  CustomerOrderHistoryEntry,
  CustomerOrderHistoryPage,
} from "@/lib/orders/order-history";
import type { MenuCatalog } from "@/types/menu";

const fetchCustomerOrders = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/order-history", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/orders/order-history")
  >("@/lib/orders/order-history");
  return {
    ...actual,
    fetchCustomerOrders,
  };
});

const fetchPublicMenu = vi.hoisted(() => vi.fn());
vi.mock("@/lib/menu/fetch-public-menu", () => ({ fetchPublicMenu }));

const mockCustomer: User = {
  id: "customer-123",
  email: "customer@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

function createMockAuthClient(user: User | null = mockCustomer) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

const mockOrder1: CustomerOrderHistoryEntry = {
  id: "order-1",
  reference: "BNC-7K2Q9F",
  status: "completed",
  fulfillment: "pickup",
  customerName: "Juan Dela Cruz",
  paymentPreference: "Cash",
  notes: "Less sweet",
  subtotal: 280,
  itemCount: 2,
  rejectionReason: null,
  createdAt: "2026-11-01T10:00:00.000Z",
  items: [
    {
      itemId: "brew-coffee",
      itemName: "Brew Special Coffee",
      variantId: "large-16",
      variantName: "16 oz",
      flavor: "Caramel",
      unitPrice: 140,
      quantity: 2,
      lineTotal: 280,
    },
  ],
};

const mockOrder2: CustomerOrderHistoryEntry = {
  id: "order-2",
  reference: "BNC-9M8P2A",
  status: "pending",
  fulfillment: "pickup",
  customerName: "Juan Dela Cruz",
  paymentPreference: "GCash",
  notes: "",
  subtotal: 120,
  itemCount: 1,
  rejectionReason: null,
  createdAt: "2026-10-25T14:30:00.000Z",
  items: [
    {
      itemId: "matcha-latte",
      itemName: "Matcha Latte",
      variantId: "medium-12",
      variantName: "12 oz",
      flavor: null,
      unitPrice: 120,
      quantity: 1,
      lineTotal: 120,
    },
  ],
};

const mockCatalog: MenuCatalog = {
  categories: [
    {
      id: "drinks",
      name: "Drinks",
      items: [
        {
          id: "brew-coffee",
          name: "Brew Special Coffee",
          availability: "available",
          flavors: ["Caramel"],
          variants: [
            {
              id: "large-16",
              name: "16 oz",
              basePrice: 140,
              flavorPrices: [{ flavor: "Caramel", price: 150 }], // Price changed 140 -> 150
              description: null,
            },
          ],
        },
      ],
    },
  ],
};

describe("OrderHistoryView (FR-039, FR-041)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-P5-001 — shows sign in prompt when customer is signed out", async () => {
    const client = createMockAuthClient(null);

    render(
      <AuthProvider client={client}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Sign In to View Orders" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/account/sign-in?returnTo=/account/orders",
    );
  });

  it("TC-P5-002 — displays orders newest first with reference, items, subtotal, and link to detail page", async () => {
    const client = createMockAuthClient(mockCustomer);
    const mockPage: CustomerOrderHistoryPage = {
      orders: [mockOrder1, mockOrder2],
      totalCount: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
    fetchCustomerOrders.mockResolvedValue(mockPage);

    render(
      <AuthProvider client={client}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Order History" }),
    ).toBeInTheDocument();

    expect(await screen.findByText("BNC-7K2Q9F")).toBeInTheDocument();
    expect(screen.getByText("BNC-9M8P2A")).toBeInTheDocument();
    expect(screen.getByText(/2x Brew Special Coffee/i)).toBeInTheDocument();
    expect(screen.getAllByText("₱280")[0]).toBeInTheDocument();
    expect(screen.getAllByText("₱120")[0]).toBeInTheDocument();

    // Each order links to its detail page
    const detailLinks = screen.getAllByRole("link", { name: "BNC-7K2Q9F" });
    expect(detailLinks[0]).toHaveAttribute("href", "/orders/BNC-7K2Q9F");
  });

  it("TC-P5-003 — shows empty state when customer has no orders", async () => {
    const client = createMockAuthClient(mockCustomer);
    const emptyPage: CustomerOrderHistoryPage = {
      orders: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
    fetchCustomerOrders.mockResolvedValue(emptyPage);

    render(
      <AuthProvider client={client}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "No Orders Yet" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });

  it("TC-P5-004 — paginates orders and responds to page change buttons", async () => {
    const user = userEvent.setup();
    const client = createMockAuthClient(mockCustomer);

    const page1: CustomerOrderHistoryPage = {
      orders: [mockOrder1],
      totalCount: 15,
      page: 1,
      pageSize: 10,
      totalPages: 2,
    };
    const page2: CustomerOrderHistoryPage = {
      orders: [mockOrder2],
      totalCount: 15,
      page: 2,
      pageSize: 10,
      totalPages: 2,
    };

    fetchCustomerOrders
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    render(
      <AuthProvider client={client}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    expect(await screen.findByText("BNC-7K2Q9F")).toBeInTheDocument();
    expect(screen.getByText(/Showing page 1 of 2/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: "Next page" });
    expect(nextBtn).toBeEnabled();

    const prevBtn = screen.getByRole("button", { name: "Previous page" });
    expect(prevBtn).toBeDisabled();

    await user.click(nextBtn);

    await waitFor(() => {
      expect(fetchCustomerOrders).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        userId: "customer-123",
      });
    });
  });

  it("TC-P5-005 — reorders items and displays explicit notices for changed prices", async () => {
    const user = userEvent.setup();
    const client = createMockAuthClient(mockCustomer);
    fetchCustomerOrders.mockResolvedValue({
      orders: [mockOrder1],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    fetchPublicMenu.mockResolvedValue(mockCatalog);

    render(
      <AuthProvider client={client}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    expect(await screen.findByText("BNC-7K2Q9F")).toBeInTheDocument();

    const reorderBtn = screen.getByRole("button", { name: "Reorder" });
    await user.click(reorderBtn);

    expect(
      await screen.findByRole("region", { name: "Reorder notices" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Added 1 item to your cart/i)).toBeInTheDocument();
    expect(screen.getByText(/Price updates:/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Price for Brew Special Coffee \(16 oz\) has changed from ₱140 to ₱150/i,
      ),
    ).toBeInTheDocument();
  });

  it("TC-P5-006 — reorders items and displays explicit notices for unavailable items", async () => {
    const user = userEvent.setup();
    const client = createMockAuthClient(mockCustomer);
    fetchCustomerOrders.mockResolvedValue({
      orders: [mockOrder2], // Contains Matcha Latte, which we won't put in catalog
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    fetchPublicMenu.mockResolvedValue(mockCatalog); // Does not contain Matcha Latte

    render(
      <AuthProvider client={client}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    expect(await screen.findByText("BNC-9M8P2A")).toBeInTheDocument();

    const reorderBtn = screen.getByRole("button", { name: "Reorder" });
    await user.click(reorderBtn);

    expect(
      await screen.findByRole("region", { name: "Reorder notices" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Unavailable items:/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Matcha Latte \(12 oz\) is no longer on the menu and could not be added/i,
      ),
    ).toBeInTheDocument();
  });

  it("TC-P5-024 — shows a reorder notice when the menu cannot be loaded", async () => {
    const user = userEvent.setup();
    const client = createMockAuthClient(mockCustomer);
    fetchCustomerOrders.mockResolvedValue({
      orders: [mockOrder1],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    fetchPublicMenu.mockRejectedValue(new Error("menu unavailable"));

    render(
      <AuthProvider client={client}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    expect(await screen.findByText("BNC-7K2Q9F")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reorder" }));

    expect(
      await screen.findByRole("region", { name: "Reorder notices" }),
    ).toHaveTextContent("We couldn't load the menu. Try again.");
    // The failure belongs to the reorder, not the page-level history error.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
