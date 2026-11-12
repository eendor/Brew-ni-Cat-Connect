import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountHomeView } from "@/components/account/account-home-view";
import { useAuth } from "@/context/auth-context";
import {
  fetchCustomerOrders,
  type CustomerOrderHistoryPage,
} from "@/lib/orders/order-history";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/orders/order-history", () => ({
  fetchCustomerOrders: vi.fn(),
}));

const latestOrder = {
  id: "order-1",
  reference: "BNC-7K2Q9F",
  status: "completed" as const,
  fulfillment: "pickup",
  customerName: "MOCK DATA — FOR DEVELOPMENT ONLY",
  paymentPreference: "Cash" as const,
  notes: "",
  subtotal: 400,
  itemCount: 3,
  rejectionReason: null,
  createdAt: "2026-11-01T10:00:00Z",
  items: [],
};

function historyPage(orders: CustomerOrderHistoryPage["orders"]) {
  return {
    orders,
    totalCount: orders.length,
    page: 1,
    pageSize: 1,
    totalPages: 1,
  };
}

function renderPage() {
  return render(<AccountHomeView />);
}

describe("AccountHomeView (FR-042)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "customer-123" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(fetchCustomerOrders).mockResolvedValue(historyPage([]));
  });

  it("TC-P5-134 — links every account page from five tiles", () => {
    renderPage();

    for (const [name, href] of [
      ["Orders", "/account/orders"],
      ["Favorites", "/account/favorites"],
      ["Rewards", "/account/rewards"],
      ["Profile", "/account/profile"],
      ["Data requests", "/account/data-request"],
    ] as const) {
      expect(
        screen.getByRole("link", { name: new RegExp(`^${name}`) }),
      ).toHaveAttribute("href", href);
    }

    expect(
      screen.getByRole("heading", { level: 1, name: "My Account" }),
    ).toBeInTheDocument();
  });

  it("TC-P5-135 — shows the newest order with the order history words, linked the same way", async () => {
    vi.mocked(fetchCustomerOrders).mockResolvedValue(
      historyPage([latestOrder]),
    );
    renderPage();

    const reference = await screen.findByRole("link", {
      name: "BNC-7K2Q9F",
    });
    expect(reference).toHaveAttribute("href", "/orders/BNC-7K2Q9F");
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText(/Placed on/)).toBeInTheDocument();
    expect(screen.getByText(/₱400/)).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();

    expect(fetchCustomerOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 1,
      userId: "customer-123",
    });
  });

  it("TC-P5-136 — shows No orders yet and a menu link when there are no orders", async () => {
    renderPage();

    expect(await screen.findByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });

  it("TC-P5-137 — shows an error with Try again and loads the order on retry", async () => {
    vi.mocked(fetchCustomerOrders)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(historyPage([latestOrder]));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load your latest order. Please try again.",
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("BNC-7K2Q9F")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchCustomerOrders).toHaveBeenCalledTimes(2));
  });

  it("TC-P5-138 — shows a loading state while the latest order loads", () => {
    vi.mocked(fetchCustomerOrders).mockReturnValue(
      new Promise(() => {
        // deliberately never resolves
      }),
    );
    renderPage();

    expect(screen.getByTestId("account-home-loading")).toBeInTheDocument();
    expect(screen.queryByText("No orders yet")).not.toBeInTheDocument();
  });
});
