import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { MenuCatalog } from "@/components/menu/menu-catalog";
import type { MenuCatalog as MenuCatalogModel } from "@/types/menu";

const populatedCatalog: MenuCatalogModel = {
  categories: [
    {
      id: "drinks",
      name: "Cat-Tastic Drinks",
      items: [
        {
          id: "matcha",
          name: "Matcha",
          availability: "available",
          flavors: ["Original", "Strawberry"],
          variants: [
            {
              id: "matcha-16",
              name: "16 oz",
              basePrice: 80,
              flavorPrices: [{ flavor: "Strawberry", price: 90 }],
              description: null,
            },
          ],
        },
        {
          id: "seasonal",
          name: "Seasonal Drink",
          availability: "unavailable",
          flavors: [],
          variants: [],
        },
      ],
    },
    {
      id: "combos",
      name: "Combos & Packages",
      items: [
        {
          id: "combo-a",
          name: "Cat Combo",
          availability: "unknown",
          flavors: [],
          variants: [
            {
              id: "combo-set-a",
              name: "Set A",
              basePrice: 149,
              flavorPrices: [],
              description: "Includes one drink and one snack.",
            },
            {
              id: "combo-cheese",
              name: "Add-on: Cheese",
              basePrice: 15,
              flavorPrices: [],
              description: null,
            },
          ],
        },
      ],
    },
    {
      id: "cat-treats",
      name: "Cat Treats",
      items: [
        {
          id: "salmon-bites",
          name: "Salmon Bites",
          availability: "available",
          flavors: [],
          variants: [
            {
              id: "salmon-bites-pack",
              name: "Pack",
              basePrice: 35,
              flavorPrices: [],
              description: null,
            },
          ],
        },
      ],
    },
  ],
};

describe("MenuCatalog", () => {
  it("TC-P2-011 — exposes a polite loading state while current data is pending", () => {
    const pendingLoader = vi.fn(
      () => new Promise<MenuCatalogModel>(() => undefined),
    );

    render(<MenuCatalog loadMenu={pendingLoader} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Brewing up the latest choices",
    );
    expect(pendingLoader).toHaveBeenCalledTimes(1);
  });

  it("TC-P2-012 — renders categories, products, sizes, flavors, prices, combo details, and availability", async () => {
    render(
      <MenuCatalog loadMenu={vi.fn().mockResolvedValue(populatedCatalog)} />,
    );

    const categoryNavigation = await screen.findByRole("navigation", {
      name: "Menu categories",
    });
    expect(
      within(categoryNavigation).getByRole("link", {
        name: "Cat-Tastic Drinks",
      }),
    ).toHaveAttribute("href", "#menu-category-1");
    expect(
      screen.getByRole("heading", { level: 2, name: "Combos & Packages" }),
    ).toBeInTheDocument();
    expect(
      within(categoryNavigation).getByRole("link", {
        name: "Cat Treats (For Cats)",
      }),
    ).toHaveAttribute("href", "#menu-category-3");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Cat Treats (For Cats)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("These treats are for cats, not food for people."),
    ).toBeInTheDocument();

    const matchaCard = screen
      .getByRole("heading", { level: 3, name: "Matcha" })
      .closest("article");
    expect(matchaCard).not.toBeNull();
    expect(
      within(matchaCard!).getByRole("list", { name: "Matcha flavors" }),
    ).toHaveTextContent("Original");
    expect(within(matchaCard!).getByText("16 oz")).toBeInTheDocument();
    expect(within(matchaCard!).getAllByText("₱80").length).toBeGreaterThan(0);
    expect(within(matchaCard!).getAllByText("Strawberry")).toHaveLength(2);
    expect(within(matchaCard!).getByText("₱90")).toBeInTheDocument();

    const unavailableCard = screen
      .getByRole("heading", { level: 3, name: "Seasonal Drink" })
      .closest("article");
    expect(
      within(unavailableCard!).getByText("Temporarily unavailable"),
    ).toBeInTheDocument();

    const comboCard = screen
      .getByRole("heading", { level: 3, name: "Cat Combo" })
      .closest("article");
    expect(
      within(comboCard!).getByText("Availability not confirmed"),
    ).toBeInTheDocument();
    expect(
      within(comboCard!).getByText("Includes one drink and one snack."),
    ).toBeInTheDocument();
    expect(within(comboCard!).getByText("Add-on: Cheese")).toBeInTheDocument();
  });

  it("TC-P2-013 — shows a truthful empty state when no category has products", async () => {
    const emptyCatalog: MenuCatalogModel = {
      categories: [{ id: "empty", name: "Empty Category", items: [] }],
    };

    render(<MenuCatalog loadMenu={vi.fn().mockResolvedValue(emptyCatalog)} />);

    expect(
      await screen.findByText("The public menu is not available right now."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Contact the shop" }),
    ).toHaveAttribute("href", "/contact");
  });

  it("TC-P2-014 — shows retrieval failure and retries through the injected loader", async () => {
    const user = userEvent.setup();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(populatedCatalog);

    render(<MenuCatalog loadMenu={loader} />);

    const errorState = await screen.findByRole("alert");
    expect(errorState).toHaveTextContent(
      "We couldn’t retrieve the current menu.",
    );

    await user.click(
      within(errorState).getByRole("button", { name: "Try again" }),
    );

    expect(
      await screen.findByRole("heading", { level: 3, name: "Matcha" }),
    ).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("TC-P2-029 — treats a zero base as a flavor-price placeholder", async () => {
    const flavorPricedCatalog: MenuCatalogModel = {
      categories: [
        {
          id: "bites",
          name: "Cat-Tastic Bites",
          items: [
            {
              id: "takoyaki",
              name: "Takoyaki",
              availability: "available",
              flavors: ["Veggie", "Shrimp"],
              variants: [
                {
                  id: "takoyaki-4",
                  name: "4pcs",
                  basePrice: 0,
                  flavorPrices: [
                    { flavor: "Veggie", price: 40 },
                    { flavor: "Shrimp", price: 60 },
                  ],
                  description: null,
                },
              ],
            },
          ],
        },
      ],
    };

    render(
      <MenuCatalog loadMenu={vi.fn().mockResolvedValue(flavorPricedCatalog)} />,
    );

    const card = (
      await screen.findByRole("heading", {
        level: 3,
        name: "Takoyaki",
      })
    ).closest("article");

    expect(card).not.toBeNull();
    expect(within(card!).getAllByText("₱40").length).toBeGreaterThan(0);
    expect(within(card!).getByText("₱60")).toBeInTheDocument();
    expect(within(card!).queryByText("₱0")).not.toBeInTheDocument();
  });
});
