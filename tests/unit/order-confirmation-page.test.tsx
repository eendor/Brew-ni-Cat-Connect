import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAdConsentForTests } from "@/lib/ads/ads";

const fetchOrder = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/fetch-order", () => ({ fetchOrder }));

vi.mock("@/lib/games/games", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/games/games")>();
  return {
    ...actual,
    fetchGameStatus: vi.fn().mockResolvedValue({
      dailyPlays: 3,
      playsToday: 0,
      playsLeft: 3,
      games: [
        {
          id: "cat-cups",
          name: "Cat cups",
          description: "Oreo hides under one of three cups. Find him!",
          choices: 3,
          winPoints: 3,
          tryPoints: 1,
          maxPoints: 3,
        },
        {
          id: "lucky-paw",
          name: "Lucky paw",
          description: "Shake the treat jar and see what Latte paws out.",
          choices: 0,
          winPoints: null,
          tryPoints: null,
          maxPoints: 5,
        },
      ],
    }),
  };
});

const mockAuth = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  isLoading: false,
}));
vi.mock("@/context/auth-context", () => ({
  useAuth: () => mockAuth,
}));

// A fake Realtime channel for simulating status changes
const realtime = vi.hoisted(() => {
  const state = {
    handler: null as null | (() => void),
    topic: "",
    removed: 0,
  };
  const channel = {
    on: (_type: string, _filter: unknown, handler: () => void) => {
      state.handler = handler;
      return channel;
    },
    subscribe: (callback?: (status: string) => void) => {
      if (callback) callback("SUBSCRIBED");
      return channel;
    },
  };
  const client = {
    channel: (topic: string) => {
      state.topic = topic;
      return channel;
    },
    removeChannel: async () => {
      state.removed += 1;
    },
  };
  return { state, client };
});
vi.mock("@/lib/supabase/public-client", () => ({
  getPublicSupabaseClient: () => realtime.client,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ reference: "BNC-7K2Q9F" }),
  usePathname: () => "/orders/BNC-7K2Q9F",
}));

import OrderConfirmationPage from "@/app/orders/[reference]/page";
import type { OrderView } from "@/lib/orders/types";

const TOKEN = "Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC10b2tlbg8";

const ORDER: OrderView = {
  reference: "BNC-7K2Q9F",
  status: "pending",
  fulfillment: "pickup",
  customerName: "Test Customer",
  paymentPreference: "Cash",
  notes: "Less ice please",
  items: [
    {
      itemId: "item-1",
      itemName: "Cheese Takoyaki",
      variantId: "variant-8",
      variantName: "8 pcs",
      flavor: null,
      unitPrice: 110,
      quantity: 2,
      lineTotal: 220,
    },
  ],
  subtotal: 220,
  itemCount: 2,
  rejectionReason: null,
  createdAt: "2026-10-25T03:00:00.000Z",
  statusHistory: [{ status: "pending", changedAt: "2026-10-25T03:00:00.000Z" }],
  realtimeTopic: "order:abcdefghijklmnopqrstuv",
};

describe("Order confirmation page", () => {
  beforeEach(() => {
    fetchOrder.mockReset();
    mockAuth.user = null;
    mockAuth.isLoading = false;
    realtime.state.handler = null;
    realtime.state.topic = "";
    realtime.state.removed = 0;
    window.localStorage.clear();
    resetAdConsentForTests();
    window.location.hash = `#token=${TOKEN}`;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("TC-P4-133 — shows a loading state, then the order", async () => {
    fetchOrder.mockResolvedValue(ORDER);
    render(<OrderConfirmationPage />);

    expect(screen.getByText("Loading order details...")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Order Placed" }),
    ).toBeInTheDocument();
    expect(fetchOrder).toHaveBeenCalledWith("BNC-7K2Q9F", TOKEN);
    expect(screen.getByText("BNC-7K2Q9F")).toBeInTheDocument();
    expect(screen.getByText("Cheese Takoyaki")).toBeInTheDocument();
    expect(screen.getByText("Less ice please")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Next Steps" }),
    ).toBeInTheDocument();
  });

  it("TC-P4-134 — shows not found when no order matches", async () => {
    fetchOrder.mockResolvedValue(null);
    render(<OrderConfirmationPage />);

    expect(
      await screen.findByRole("heading", { name: "Order Not Found" }),
    ).toBeInTheDocument();
  });

  it("TC-P4-135 — shows not found without a request when a guest link has no token", async () => {
    window.location.hash = "";
    mockAuth.user = null;
    mockAuth.isLoading = false;
    render(<OrderConfirmationPage />);

    expect(
      await screen.findByRole("heading", { name: "Order Not Found" }),
    ).toBeInTheDocument();
    expect(fetchOrder).not.toHaveBeenCalled();
  });

  it("TC-P4-136 — shows an error with Try Again when loading fails", async () => {
    fetchOrder.mockRejectedValue(new Error("offline"));
    render(<OrderConfirmationPage />);

    expect(
      await screen.findByRole("heading", { name: "Something Went Wrong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
  });

  it("TC-P5-064 — shows the shop's status change without a reload, then stops listening (FR-046, FR-047)", async () => {
    fetchOrder
      .mockResolvedValueOnce(ORDER)
      .mockResolvedValueOnce({ ...ORDER, status: "ready" })
      .mockResolvedValueOnce({ ...ORDER, status: "completed" });

    render(<OrderConfirmationPage />);
    expect((await screen.findAllByText("pending")).length).toBeGreaterThan(0);
    expect(realtime.state.topic).toBe(ORDER.realtimeTopic);

    await act(async () => {
      realtime.state.handler?.();
    });
    expect((await screen.findAllByText("ready")).length).toBeGreaterThan(0);
    expect(fetchOrder).toHaveBeenLastCalledWith("BNC-7K2Q9F", TOKEN);

    await act(async () => {
      realtime.state.handler?.();
    });
    expect((await screen.findAllByText("completed")).length).toBeGreaterThan(0);
    // Terminal status stops listening
    expect(realtime.state.removed).toBeGreaterThan(0);
  });

  it("TC-P5-058 — lets authenticated customer view their own order without a hash token (FR-044)", async () => {
    window.location.hash = "";
    mockAuth.user = { id: "user-123", email: "customer@example.com" };
    mockAuth.isLoading = false;

    fetchOrder.mockResolvedValueOnce(ORDER);

    render(<OrderConfirmationPage />);

    expect(
      await screen.findByRole("heading", { name: "Order Placed" }),
    ).toBeInTheDocument();
    expect(fetchOrder).toHaveBeenCalledWith("BNC-7K2Q9F", null);
  });

  it("TC-P5-059 — fails cross-account tracking attempts when order does not belong to authenticated user (FR-044)", async () => {
    window.location.hash = "";
    mockAuth.user = { id: "user-456", email: "other@example.com" };
    mockAuth.isLoading = false;

    // Server-side ownership validation returns null for unauthorized user
    fetchOrder.mockResolvedValueOnce(null);

    render(<OrderConfirmationPage />);

    expect(
      await screen.findByRole("heading", { name: "Order Not Found" }),
    ).toBeInTheDocument();
    expect(fetchOrder).toHaveBeenCalledWith("BNC-7K2Q9F", null);
  });

  it("TC-P5-063 — hides the Next Steps card when order status is final (rejected, cancelled, completed), but shows it for non-final statuses", async () => {
    fetchOrder.mockResolvedValueOnce({ ...ORDER, status: "pending" });
    const { unmount } = render(<OrderConfirmationPage />);
    expect(
      await screen.findByRole("heading", { name: "Next Steps" }),
    ).toBeInTheDocument();
    unmount();

    fetchOrder.mockResolvedValueOnce({
      ...ORDER,
      status: "rejected",
      rejectionReason: "Out of stock",
    });
    render(<OrderConfirmationPage />);
    expect(
      await screen.findByRole("heading", { name: "Order Placed" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Next Steps" }),
    ).not.toBeInTheDocument();
  });

  it("TC-P9-042 — invites the customer to play while the shop works on the order, and remembers the order for the way back (FR-089)", async () => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", `/orders/BNC-7K2Q9F#token=${TOKEN}`);
    for (const status of ["pending", "accepted", "preparing"] as const) {
      fetchOrder.mockResolvedValue({ ...ORDER, status });
      const { unmount } = render(<OrderConfirmationPage />);
      expect(
        await screen.findByRole("heading", { name: "Play while you wait" }),
      ).toBeInTheDocument();
      unmount();
    }

    fetchOrder.mockResolvedValue(ORDER);
    render(<OrderConfirmationPage />);
    const link = await screen.findByRole("link", { name: "Play cat games" });
    expect(link).toHaveAttribute("href", "/games");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(window.sessionStorage.getItem("bnc-waiting-order")).toBe(
      `/orders/BNC-7K2Q9F#token=${TOKEN}`,
    );
  });

  it("TC-P9-043 — leaves the games out once the order is ready or closed (FR-089)", async () => {
    for (const status of [
      "ready",
      "completed",
      "cancelled",
      "rejected",
    ] as const) {
      fetchOrder.mockResolvedValue({ ...ORDER, status });
      const { unmount } = render(<OrderConfirmationPage />);
      await screen.findByText("BNC-7K2Q9F");
      expect(screen.queryByTestId("play-while-you-wait")).toBeNull();
      unmount();
    }
  });

  it("TC-P9-053 — opens the in-place mini-games popup on waiting orders and shows the ad slot on waiting and completed orders only (FR-089, FR-090 update)", async () => {
    vi.stubEnv("NEXT_PUBLIC_AD_KEY", "0123456789abcdef0123456789abcdef");

    for (const status of [
      "pending",
      "accepted",
      "preparing",
      "completed",
    ] as const) {
      fetchOrder.mockResolvedValueOnce({ ...ORDER, status });
      const { unmount } = render(<OrderConfirmationPage />);
      await screen.findByText("BNC-7K2Q9F");
      expect(screen.getByTestId("ad-slot")).toBeInTheDocument();
      unmount();
    }

    for (const status of ["ready", "cancelled", "rejected"] as const) {
      fetchOrder.mockResolvedValueOnce({ ...ORDER, status });
      const { unmount } = render(<OrderConfirmationPage />);
      await screen.findByText("BNC-7K2Q9F");
      expect(screen.queryByTestId("ad-slot")).toBeNull();
      unmount();
    }

    fetchOrder.mockResolvedValueOnce({ ...ORDER, status: "preparing" });
    render(<OrderConfirmationPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Play popup" }));
    const dialog = await screen.findByTestId("play-games-popup");
    expect(dialog).toHaveTextContent("Cat cups");
    expect(dialog).toHaveTextContent("Lucky paw");
    fireEvent.click(screen.getByRole("button", { name: "Close games popup" }));
    expect(screen.queryByTestId("play-games-popup")).toBeNull();
  });
});
