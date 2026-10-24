import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";

afterEach(cleanup);

describe("CheckoutSteps", () => {
    it("marks the right step as current", () => {
    const { container } = render(<CheckoutSteps step="review" />);
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("Review");
  });

  it("marks finished steps as done", () => {
    render(<CheckoutSteps step="send" />);
    expect(screen.getAllByText("(done)")).toHaveLength(2);
  });
});