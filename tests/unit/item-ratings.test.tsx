import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderHistoryView } from "@/components/account/order-history-view";
import { MenuCatalog } from "@/components/menu/menu-catalog";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import type { CustomerOrderHistoryEntry } from "@/lib/orders/order-history";
import type { MenuCatalog as MenuCatalogModel, MenuItem } from "@/types/menu";

const fetchCustomerOrders = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/order-history", async () => ({
  ...(await vi.importActual<typeof import("@/lib/orders/order-history")>(
    "@/lib/orders/order-history",
  )),
  fetchCustomerOrders,
}));

const fetchPublicMenu = vi.hoisted(() => vi.fn());
vi.mock("@/lib/menu/fetch-public-menu", () => ({ fetchPublicMenu }));

const ratings = vi.hoisted(() => ({
  fetchMyItemRatings: vi.fn(),
  rateItem: vi.fn(),
}));
vi.mock("@/lib/menu/item-ratings", async () => ({
  ...(await vi.importActual<typeof import("@/lib/menu/item-ratings")>(
    "@/lib/menu/item-ratings",
  )),
  ...ratings,
}));

const item = (id: string, name: string): MenuItem => ({
  id,
  name,
  availability: "available",
  flavors: [],
  variants: [
    {
      id: `${id}-1`,
      name: "Regular",
      basePrice: 100,
      flavorPrices: [],
      description: null,
    },
  ],
});

// The website menu: the shop-only items are already left out
const catalog: MenuCatalogModel = {
  categories: [
    {
      id: "drinks",
      name: "Drinks",
      items: [item("latte", "Latte"), item("mocha", "Mocha")],
    },
  ],
};

const customer: User = {
  id: "customer-1",
  email: "customer@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

const authClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: customer } },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    getUser: vi
      .fn()
      .mockResolvedValue({ data: { user: customer }, error: null }),
  },
} as unknown as SupabaseClient;

const line = (itemId: string, itemName: string) => ({
  itemId,
  itemName,
  variantId: "v",
  variantName: "Regular",
  flavor: null,
  unitPrice: 100,
  quantity: 1,
  lineTotal: 100,
});

const order = (
  id: string,
  status: CustomerOrderHistoryEntry["status"],
  items: CustomerOrderHistoryEntry["items"],
): CustomerOrderHistoryEntry => ({
  id,
  reference: `BNC-${id}`,
  status,
  fulfillment: "pickup",
  customerName: "Test Customer",
  paymentPreference: "Cash",
  notes: "",
  subtotal: 100 * items.length,
  itemCount: items.length,
  rejectionReason: null,
  createdAt: "2026-11-19T10:00:00.000Z",
  items,
});

describe("Item ratings on the website (FR-121)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-P9-093 — the menu shows each rated item's average and count, and still shows when ratings fail", async () => {
    const loadMenu = vi.fn().mockResolvedValue(catalog);
    const { unmount } = render(
      <MenuCatalog
        loadMenu={loadMenu}
        loadRatings={vi
          .fn()
          .mockResolvedValue(new Map([["latte", { average: 4.5, count: 12 }]]))}
      />,
    );
    expect(
      await screen.findByText("Rated 4.5 out of 5 by 12 customers"),
    ).toBeInTheDocument();
    const mocha = screen
      .getByRole("heading", { name: "Mocha" })
      .closest("article") as HTMLElement;
    expect(within(mocha).queryByText(/^Rated /)).toBeNull();
    unmount();

    render(
      <MenuCatalog
        loadMenu={loadMenu}
        loadRatings={vi.fn().mockRejectedValue(new Error("offline"))}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "Latte" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Rated /)).toBeNull();
  });

  it("TC-P9-094 — a completed order offers stars for menu items only, and a tap saves the rating", async () => {
    fetchPublicMenu.mockResolvedValue(catalog);
    ratings.fetchMyItemRatings.mockResolvedValue(new Map([["mocha", 3]]));
    ratings.rateItem.mockResolvedValue({ ok: true });
    fetchCustomerOrders.mockResolvedValue({
      orders: [
        order("AAAAAA", "completed", [
          line("latte", "Latte"),
          line("mocha", "Mocha"),
          line("box", "Take-out Box"),
          line("water", "Bottled Water"),
          line("tuna", "Tuna Bites"),
        ]),
        order("BBBBBB", "preparing", [line("latte", "Latte")]),
      ],
      totalCount: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <AuthProvider client={authClient}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    const latte = await screen.findByRole("group", { name: "Rate Latte" });
    // Only the completed order's two menu items: not the box, water, cat
    // treats or the order still being prepared
    expect(screen.getAllByRole("group", { name: /^Rate / })).toHaveLength(2);
    expect(
      within(screen.getByRole("group", { name: "Rate Mocha" })).getByRole(
        "button",
        { name: "3 stars" },
      ),
    ).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(
      within(latte).getByRole("button", { name: "4 stars" }),
    );
    expect(ratings.rateItem).toHaveBeenCalledWith("latte", 4);
    await waitFor(() =>
      expect(
        within(latte).getByRole("button", { name: "4 stars" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("TC-P9-095 — a refused rating shows why", async () => {
    fetchPublicMenu.mockResolvedValue(catalog);
    ratings.fetchMyItemRatings.mockResolvedValue(new Map());
    ratings.rateItem.mockResolvedValue({
      ok: false,
      message: "We couldn't save your rating. Try again.",
    });
    fetchCustomerOrders.mockResolvedValue({
      orders: [order("CCCCCC", "completed", [line("latte", "Latte")])],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <AuthProvider client={authClient}>
        <CartProvider>
          <OrderHistoryView />
        </CartProvider>
      </AuthProvider>,
    );

    const latte = await screen.findByRole("group", { name: "Rate Latte" });
    await userEvent.click(
      within(latte).getByRole("button", { name: "5 stars" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't save your rating. Try again.",
    );
    expect(
      within(latte).getByRole("button", { name: "5 stars" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
