import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStatusTracker } from "@/components/orders/order-status-tracker";
import type { OrderStatus, OrderView } from "@/lib/orders/types";

// Mock the hook to isolate component tests
const mockUseOrderStatus = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/use-order-status", () => ({
  useOrderStatus: (...args: unknown[]) => mockUseOrderStatus(...args),
  TRACKER_STAGES: [
    { status: "pending", label: "Pending", description: "Order placed" },
    { status: "accepted", label: "Accepted", description: "Shop accepted" },
    { status: "preparing", label: "Preparing", description: "Being prepared" },
    { status: "ready", label: "Ready", description: "Ready for pickup" },
    { status: "completed", label: "Completed", description: "Completed" },
  ],
}));

const BASE_ORDER: OrderView = {
  reference: "BNC-7K2Q9F",
  status: "pending",
  fulfillment: "pickup",
  customerName: "Juan Dela Cruz",
  paymentPreference: "Cash",
  notes: "None",
  items: [
    {
      itemId: "item-1",
      itemName: "Brew Special",
      variantId: "v-1",
      variantName: "16 oz",
      flavor: null,
      unitPrice: 150,
      quantity: 1,
      lineTotal: 150,
    },
  ],
  subtotal: 150,
  itemCount: 1,
  rejectionReason: null,
  createdAt: "2026-11-04T08:00:00Z",
  statusHistory: [{ status: "pending", changedAt: "2026-11-04T08:00:00Z" }],
  realtimeTopic: "order:3kQ9F2aBcDeFgHiJkLmNoP",
};

describe("OrderStatusTracker component", () => {
  beforeEach(() => {
    mockUseOrderStatus.mockReset();
    mockUseOrderStatus.mockReturnValue({
      order: BASE_ORDER,
      isRealtimeConnected: true,
      isRefreshing: false,
      refresh: vi.fn(),
      error: null,
    });
  });

  const statuses: OrderStatus[] = [
    "pending",
    "accepted",
    "preparing",
    "ready",
    "completed",
  ];

  for (const status of statuses) {
    it(`TC-P5-012.${status} — correctly renders and marks stage '${status}' as current (FR-046)`, () => {
      const orderForStatus: OrderView = {
        ...BASE_ORDER,
        status,
        statusHistory: [
          { status: "pending", changedAt: "2026-11-04T08:00:00Z" },
          ...(status !== "pending"
            ? [{ status, changedAt: "2026-11-04T08:10:00Z" }]
            : []),
        ],
      };

      mockUseOrderStatus.mockReturnValue({
        order: orderForStatus,
        isRealtimeConnected: true,
        isRefreshing: false,
        refresh: vi.fn(),
        error: null,
      });

      render(<OrderStatusTracker order={orderForStatus} />);

      const currentStage = screen.getByTestId(`tracker-stage-${status}`);
      expect(currentStage).toHaveAttribute("aria-current", "step");
      expect(screen.getByTestId("current-status-label")).toHaveTextContent(
        status,
      );
    });
  }

  it("TC-P5-013 — visually distinguishes completed, current, and upcoming stages (FR-046)", () => {
    const preparingOrder: OrderView = {
      ...BASE_ORDER,
      status: "preparing",
      statusHistory: [
        { status: "pending", changedAt: "2026-11-04T08:00:00Z" },
        { status: "accepted", changedAt: "2026-11-04T08:05:00Z" },
        { status: "preparing", changedAt: "2026-11-04T08:10:00Z" },
      ],
    };

    mockUseOrderStatus.mockReturnValue({
      order: preparingOrder,
      isRealtimeConnected: true,
      isRefreshing: false,
      refresh: vi.fn(),
      error: null,
    });

    render(<OrderStatusTracker order={preparingOrder} />);

    // 'pending' and 'accepted' should be completed
    const pendingIcon = screen.getByTestId("stage-icon-pending");
    expect(pendingIcon.querySelector("svg")).toBeInTheDocument(); // Checkmark icon

    const acceptedIcon = screen.getByTestId("stage-icon-accepted");
    expect(acceptedIcon.querySelector("svg")).toBeInTheDocument(); // Checkmark icon

    // 'preparing' should be current
    const preparingStage = screen.getByTestId("tracker-stage-preparing");
    expect(preparingStage).toHaveAttribute("aria-current", "step");

    // 'ready' and 'completed' should be upcoming
    const readyStage = screen.getByTestId("tracker-stage-ready");
    expect(readyStage).not.toHaveAttribute("aria-current");
  });

  it("TC-P5-014 — displays timestamps on stages and status history (FR-046)", () => {
    const orderWithHistory: OrderView = {
      ...BASE_ORDER,
      status: "accepted",
      statusHistory: [
        { status: "pending", changedAt: "2026-11-04T08:00:00Z" },
        { status: "accepted", changedAt: "2026-11-04T08:05:00Z" },
      ],
    };

    mockUseOrderStatus.mockReturnValue({
      order: orderWithHistory,
      isRealtimeConnected: true,
      isRefreshing: false,
      refresh: vi.fn(),
      error: null,
    });

    render(<OrderStatusTracker order={orderWithHistory} />);

    expect(screen.getByTestId("stage-time-pending")).toBeInTheDocument();
    expect(screen.getByTestId("stage-time-accepted")).toBeInTheDocument();

    const historyList = screen.getByTestId("status-history-list");
    expect(within(historyList).getByText("Order Received")).toBeInTheDocument();
    expect(
      within(historyList).getByText("Accepted by Shop"),
    ).toBeInTheDocument();
  });

  it("TC-P5-015 — renders rejected order with reason and recommended next action (FR-049)", () => {
    const rejectedOrder: OrderView = {
      ...BASE_ORDER,
      status: "rejected",
      rejectionReason: "Out of matcha powder for selected drink.",
      statusHistory: [
        { status: "pending", changedAt: "2026-11-04T08:00:00Z" },
        { status: "rejected", changedAt: "2026-11-04T08:02:00Z" },
      ],
    };

    mockUseOrderStatus.mockReturnValue({
      order: rejectedOrder,
      isRealtimeConnected: false,
      isRefreshing: false,
      refresh: vi.fn(),
      error: null,
    });

    render(<OrderStatusTracker order={rejectedOrder} />);

    expect(screen.getByTestId("rejected-order-banner")).toBeInTheDocument();
    expect(screen.getByTestId("rejection-reason")).toHaveTextContent(
      "Out of matcha powder for selected drink.",
    );
    const nextSteps = screen.getByTestId("rejected-next-steps");
    expect(nextSteps).toHaveTextContent("What should you do next?");
    expect(nextSteps).toHaveTextContent(
      "You have not been charged for this order.",
    );
    expect(
      screen.getByRole("link", { name: "Back to Menu" }),
    ).toBeInTheDocument();
  });

  it("TC-P5-016 — shows manual refresh button and offline indicator when Realtime disconnected (FR-048)", async () => {
    const mockRefresh = vi.fn();
    mockUseOrderStatus.mockReturnValue({
      order: BASE_ORDER,
      isRealtimeConnected: false,
      isRefreshing: false,
      refresh: mockRefresh,
      error: null,
    });

    const user = userEvent.setup();
    render(<OrderStatusTracker order={BASE_ORDER} />);

    expect(
      screen.getByTestId("realtime-status-disconnected"),
    ).toBeInTheDocument();
    const refreshBtn = screen.getByTestId("manual-refresh-button");
    expect(refreshBtn).toBeInTheDocument();

    await user.click(refreshBtn);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("TC-P5-017 — renders loading state cleanly", () => {
    mockUseOrderStatus.mockReturnValue({
      order: null,
      isRealtimeConnected: false,
      isRefreshing: false,
      refresh: vi.fn(),
      error: null,
    });

    render(<OrderStatusTracker isLoading={true} />);

    expect(screen.getByTestId("order-tracker-loading")).toBeInTheDocument();
  });

  it("TC-P5-018 — renders error state cleanly with retry option", async () => {
    const mockRefresh = vi.fn();
    mockUseOrderStatus.mockReturnValue({
      order: null,
      isRealtimeConnected: false,
      isRefreshing: false,
      refresh: mockRefresh,
      error: "Network connection lost",
    });

    const user = userEvent.setup();
    render(<OrderStatusTracker order={null} error="Network connection lost" />);

    expect(screen.getByTestId("order-tracker-error")).toHaveTextContent(
      "Network connection lost",
    );
    const retryBtn = screen.getByRole("button", { name: "Retry" });
    await user.click(retryBtn);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
