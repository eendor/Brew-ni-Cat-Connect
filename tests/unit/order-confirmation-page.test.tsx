import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OrderConfirmationPage from "@/app/orders/[reference]/page";

// Mock Next.js useParams
vi.mock("next/navigation", () => ({
  useParams: () => ({ reference: "BNC-234567" }),
}));

// Mock fetchOrder helper
vi.mock("@/lib/orders/fetch-order", () => ({
  fetchOrder: vi.fn().mockResolvedValue({
    reference: "BNC-234567",
    createdAt: new Date().toISOString(),
    status: "pending",
    customerName: "Test Customer Verification",
    paymentPreference: "Cash",
    fulfillment: "pickup",
    notes: "Less ice please",
    itemCount: 3,
    rejectionReason: null,
    realtimeTopic: "order:BNC-234567",
    statusHistory: [],
    items: [
      {
        itemId: "item-1",
        variantId: "var-1",
        itemName: "Brew Special Coffee",
        variantName: "Large",
        flavor: "Caramel",
        quantity: 2,
        unitPrice: 150,
        lineTotal: 300,
      },
    ],
    subtotal: 420,
  }),
}));

// Mock order link hash reader
vi.mock("@/lib/orders/order-link", () => ({
  readTrackingTokenFromHash: () => "1234567890123456789012345678901234567890123",
}));

describe("OrderConfirmationPage Component Tests", () => {
  it("renders order confirmation page with loaded details", async () => {
    render(<OrderConfirmationPage />);
    const heading = await screen.findByText(/ORDER CONFIRMED/i);
    expect(heading).toBeInTheDocument();
  });
});