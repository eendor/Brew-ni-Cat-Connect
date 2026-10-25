import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MenuCartBar } from "@/components/cart/menu-cart-bar";
import { useCart } from "@/context/cart-context";

vi.mock("@/context/cart-context", () => ({ useCart: vi.fn() }));

const openDrawer = vi.fn();

function mockCart(overrides = {}) {
  vi.mocked(useCart).mockReturnValue({
    itemCount: 3,
    subtotal: 385,
    isEmpty: false,
    isHydrated: true,
    openDrawer,
    ...overrides,
  } as never);
}

afterEach(() => {
  cleanup();
  openDrawer.mockClear();
});

describe("MenuCartBar", () => {
  it("TC-P3-062 — is hidden when the cart is empty", () => {
    mockCart({ itemCount: 0, subtotal: 0, isEmpty: true });
    const { container } = render(<MenuCartBar />);
    expect(container.innerHTML).toBe("");
  });

  it("TC-P3-063 — is hidden until the cart has loaded", () => {
    mockCart({ isHydrated: false });
    const { container } = render(<MenuCartBar />);
    expect(container.innerHTML).toBe("");
  });

  it("TC-P3-064 — shows the count and total", () => {
    mockCart();
    const { container } = render(<MenuCartBar />);
    expect(container.textContent).toContain("3 items");
    expect(container.textContent).toContain("385");
  });

  it("TC-P3-065 — uses the singular for one item", () => {
    mockCart({ itemCount: 1, subtotal: 120 });
    const { container } = render(<MenuCartBar />);
    expect(container.textContent).toContain("1 item ·");
    expect(container.textContent).toContain("120");
  });

  it("TC-P3-066 — opens the drawer when the button is clicked", () => {
    mockCart();
    render(<MenuCartBar />);
    fireEvent.click(screen.getByRole("button", { name: "View cart" }));
    expect(openDrawer).toHaveBeenCalledTimes(1);
  });
});
