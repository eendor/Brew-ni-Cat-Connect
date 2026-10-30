import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MenuItemCard } from "@/components/menu/menu-item-card";
import {
  CART_TOSS_EVENT,
  CART_TOSS_MS,
  requestCartToss,
  setCartFxActive,
} from "@/components/three/cart-toss";
import { optimizedSrc } from "@/components/three/engine/image-src";
import { shouldRunThree } from "@/components/three/engine/runtime";
import { HomeShowcase } from "@/components/three/home-showcase";
import { glowForItem, showcaseItems } from "@/components/three/showcase-data";
import { visitFacts } from "@/components/three/visit-facts";
import { VisitStage } from "@/components/three/visit-stage";
import { CartProvider } from "@/context/cart-context";
import type { MenuItem } from "@/types/menu";
import { fallbackShop } from "@/lib/site-content/fallback-shop";

const toss = {
  from: { x: 10, y: 20, width: 100, height: 40 },
  photo: null,
  glow: "#7CFF6B",
  label: "Matcha",
};

describe("3D layer (TC-P4-006 – TC-P4-010)", () => {
  afterEach(() => setCartFxActive(false));

  it("TC-P4-006 — cart toss is a no-op without the 3D cart layer", () => {
    const listener = vi.fn();
    window.addEventListener(CART_TOSS_EVENT, listener);
    expect(requestCartToss(toss)).toBe(0);
    expect(listener).not.toHaveBeenCalled();

    setCartFxActive(true);
    expect(requestCartToss(toss)).toBe(CART_TOSS_MS);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(CART_TOSS_EVENT, listener);
  });

  it("TC-P4-007 — without WebGL the home showcase renders its static fallback", () => {
    expect(shouldRunThree()).toBe(false);
    const prices = {
      matcha: 49,
      catfeine: 55,
      takoyaki: 40,
      fries: 30,
      buldak: null,
    };
    render(
      <HomeShowcase
        eyebrow="Kabacan, Cotabato · Est. June 2026"
        title="Coffee, comfort, and a little cat energy."
        lede="Drinks and snacks in Kabacan."
        prices={prices}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Coffee, comfort, and a little cat energy.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse current menu" }),
    ).toHaveAttribute("href", "/menu");
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    for (const item of showcaseItems) {
      expect(within(list).getByRole("img", { name: item.alt })).toBeVisible();
    }
    // prices come from the live menu; one it can't give is left out
    expect(within(list).getByText("From ₱55")).toBeInTheDocument();
    expect(within(list).getAllByText("From ₱49")).toHaveLength(1);
    expect(within(list).getAllByText(/^From ₱/)).toHaveLength(4);
  });

  it("TC-P4-008 — visit facts restate the saved hours and landmark", () => {
    const facts = visitFacts(fallbackShop.hours, fallbackShop.address);
    expect(facts).toEqual({
      hours: "11 AM – 9 PM",
      days: "Monday to Friday",
      others: "Sunday 1 PM – 9 PM",
      closedDay: "Saturday",
      shopSign: "Brew ni Cat",
      neighborSign: "Pulido Eatery",
      street: "Abellera St",
    });
    // a different schedule changes the sign with no code change
    expect(
      visitFacts(
        {
          ...fallbackShop.hours,
          days: {
            ...fallbackShop.hours.days,
            saturday: { opens: "08:00", closes: "12:30" },
            sunday: null,
          },
        },
        { ...fallbackShop.address, landmark: "Near the Town Plaza" },
      ),
    ).toMatchObject({
      others: "Saturday 8 AM – 12:30 PM",
      closedDay: "Sunday",
      neighborSign: "the Town Plaza",
    });
    render(<VisitStage facts={facts} />);
    expect(screen.queryByRole("button", { name: "Flip the sign" })).toBeNull();
  });

  it("TC-P4-009 — menu cards drop the 'Ready to enjoy?' line and stay plain", () => {
    const item: MenuItem = {
      id: "buldak-carbo",
      name: "Buldak Carbo",
      availability: "available",
      flavors: [],
      variants: [
        {
          id: "plain",
          name: "Plain Carbo Samyang",
          basePrice: 119,
          flavorPrices: [],
          description: null,
        },
      ],
    };
    const { container } = render(
      <CartProvider>
        <MenuItemCard item={item} />
      </CartProvider>,
    );
    expect(screen.queryByText("Ready to enjoy?")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Order Buldak Carbo" }),
    ).toHaveAttribute("data-order-trigger");
    expect(container.querySelector("[data-three-tile]")).toBeNull();
    expect(
      screen.getByRole("img", {
        name: "Buldak Carbo spicy noodles with a fried egg",
      }),
    ).toBeInTheDocument();
    // uniform cards: no per-item glow color or other inline styling
    const article = container.querySelector<HTMLElement>("article");
    expect(article).not.toBeNull();
    expect(article?.getAttribute("style")).toBeNull();
  });

  it("TC-P4-010 — glow colors and optimized texture URLs", () => {
    expect(glowForItem("Buldak Cheese")).toBe("#5EE1FF");
    expect(glowForItem("Something new")).toBe("#FFB547");
    expect(optimizedSrc("/images/a b.jpg", 640)).toBe(
      "/_next/image?url=%2Fimages%2Fa%20b.jpg&w=640&q=75",
    );
    expect(optimizedSrc("https://example.com/x.jpg")).toBe(
      "https://example.com/x.jpg",
    );
  });
});
