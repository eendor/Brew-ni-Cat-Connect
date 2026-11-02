import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchOrder = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/fetch-order", () => ({ fetchOrder }));
// A fake Realtime channel: the test fires the broadcast by hand.
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
    subscribe: () => channel,
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
    realtime.state.handler = null;
    realtime.state.topic = "";
    realtime.state.removed = 0;
    window.location.hash = `#token=${TOKEN}`;
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

  it("TC-P4-135 — shows not found without a request when the link has no token", async () => {
    window.location.hash = "";
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

  it("TC-P4-263 — shows the shop's status change without a reload, then stops listening", async () => {
    fetchOrder
      .mockResolvedValueOnce(ORDER)
      .mockResolvedValueOnce({ ...ORDER, status: "ready" })
      .mockResolvedValueOnce({ ...ORDER, status: "completed" });
    render(<OrderConfirmationPage />);
    expect(await screen.findByText("pending")).toBeInTheDocument();
    expect(realtime.state.topic).toBe(ORDER.realtimeTopic);

    await act(async () => {
      realtime.state.handler?.();
    });
    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(fetchOrder).toHaveBeenLastCalledWith("BNC-7K2Q9F", TOKEN);

    await act(async () => {
      realtime.state.handler?.();
    });
    expect(await screen.findByText("completed")).toBeInTheDocument();
    // A completed order never changes again, so the page stops listening.
    expect(realtime.state.removed).toBeGreaterThan(0);
  });
});
