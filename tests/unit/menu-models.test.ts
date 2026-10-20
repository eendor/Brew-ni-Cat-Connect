import { describe, expect, it } from "vitest";

import {
  defaultFlavor,
  modelSpecFor,
  type ModelPart,
  type ModelSpec,
} from "@/components/three/menu-models";
import type { MenuItem, MenuVariant } from "@/types/menu";

function variant(
  id: string,
  name: string,
  basePrice: number,
  extra: Partial<MenuVariant> = {},
): MenuVariant {
  return {
    id,
    name,
    basePrice,
    flavorPrices: [],
    description: null,
    ...extra,
  };
}

function menuItem(
  name: string,
  variants: MenuVariant[],
  flavors: string[] = [],
): MenuItem {
  return {
    id: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    availability: "available",
    flavors,
    variants,
  };
}

const cupSizes = (small: number, medium: number, large: number) => [
  variant("12oz", "12oz", small),
  variant("16oz", "16oz", medium),
  variant("22oz", "22oz", large),
];

const combo = (id: string, name: string, price: number, description: string) =>
  variant(id, name, price, { description });

const takoyakiFlavors = [
  "Veggie Whiskers",
  "Cheesy Calico",
  "Squid Treats",
  "Shrimp Whisker",
];
// Prices come sorted by flavor name, the way the catalog mapper hands
// them over, so their order is not the menu's own flavor order.
const takoyakiSize = (pieces: number, prices: number[]) =>
  variant(`${pieces}pcs`, `${pieces}pcs`, 0, {
    flavorPrices: takoyakiFlavors
      .map((flavor, index) => ({ flavor, price: prices[index] ?? 0 }))
      .sort((left, right) => left.flavor.localeCompare(right.flavor)),
  });

/** The live menu: every item guests can open in 3D. */
const live = {
  carbo: menuItem("Buldak Carbo", [
    variant("plain", "Plain Carbo Samyang", 119),
    variant("milk", "Carbo Samyang w/ Milk", 129),
    variant("egg", "Carbo Samyang w/ Egg", 135),
  ]),
  cheese: menuItem("Buldak Cheese", [
    variant("plain", "Plain Cheese Samyang", 109),
    variant("milk", "Cheese Samyang w/ Milk", 119),
    variant("egg", "Cheese Samyang w/ Egg", 130),
  ]),
  sedaap: menuItem("Sedaap Original", [variant("regular", "Regular", 65)]),
  sedaapSpicy: menuItem(
    "Sedaap Spicy Chicken",
    [variant("regular", "Regular", 69)],
    ["1 Paw (Mild)", "2 Paws (Medium)", "3 Paws (Extra Hot)"],
  ),
  treats: menuItem("Cat Treats", [variant("regular", "Regular", 5)]),
  box: menuItem("Take-out Box", [variant("regular", "Regular", 10)]),
  fries: menuItem(
    "Fries (Cat Claws)",
    [
      variant("small", "Small", 30),
      variant("medium", "Medium", 50),
      variant("large", "Large", 70),
      variant("jumbo", "Jumbo", 150),
    ],
    ["BBQ Scratch", "Cheesy Purr", "Sour Cream Meow", "Spicy Claw"],
  ),
  nachos: menuItem("Nachos (Kitty Litter Crisps)", [
    variant("nvm", "Nachos+Veggies+Meat", 99),
    variant("nfm", "Nachos+Fries+Meat", 119),
    variant("nfmv", "Nachos+Fries+Meat+Veggies", 129),
  ]),
  takoyaki: menuItem(
    "Takoyaki (Pawsome Balls)",
    [
      takoyakiSize(4, [40, 50, 55, 60]),
      takoyakiSize(8, [80, 100, 110, 120]),
      takoyakiSize(12, [120, 150, 160, 180]),
      takoyakiSize(16, [150, 200, 210, 240]),
    ],
    takoyakiFlavors,
  ),
  coffee: menuItem("Cat-Feine (Classic Coffee)", cupSizes(49, 59, 79), [
    "Salted Caramel Tail",
    "Vanilla Iced Whisker",
    "Caramel Meow-chiato",
    "Hazelnut Hairball",
    "Salted Caramel Paws",
    "Siamese Latte",
  ]),
  matcha: menuItem("Matcha (The Lucky Green Neko)", cupSizes(49, 59, 79), [
    "Dirty Neko",
    "Vanilla Matcha Meow",
    "Caramel Matcha Tail",
    "Salted Caramel Meow-cha",
  ]),
  oreo: menuItem("Oreo (The Tuxedo Cat)", cupSizes(49, 59, 79), [
    "Caramel Oreo Kitten",
    "Oreo Iced Paw-tte",
    "Vanilla Oreo Whisker",
  ]),
  soda: menuItem("Soda (Fizzy Felines)", cupSizes(39, 49, 69), [
    "Yogurt Yarn",
    "Honey Peach Paws",
    "Passion Fruit Purr",
    "Kiwi Kitten",
    "Strawberry Scratch",
    "Lychee Litter",
    "Blueberry Bite",
    "Grumpy Grapes",
    "Green Apple Alley Cat",
  ]),
  catAssociation: menuItem("Cat Association", [
    combo(
      "scaredy",
      "Scaredy Cats",
      450,
      "16pcs Veggie Takoyaki + Jumbo Fries (Any flavor) + 4pcs 12oz soda",
    ),
    combo(
      "lazy",
      "Lazy Cats",
      340,
      "12pcs Cheese Takoyaki + 2pcs 16oz soda (Any flavor) + 2pcs 16oz coffee (Any flavor)",
    ),
    combo(
      "grumpy",
      "Grumpy Cats",
      480,
      "Jumbo fries (Any flavor) + nachos + meat + veggies + 4pcs 16oz coffee (Any flavor)",
    ),
    combo(
      "funny",
      "Funny Cats",
      470,
      "Jumbo Fries (Any flavor) + 3pcs 16oz coffee (Any flavor) + 3pcs 16oz soda (Any flavor)",
    ),
    combo(
      "super",
      "Super Cats",
      590,
      "Jumbo Fries (Any flavor) + 16pcs Veggie Takoyaki + 2pcs 22oz soda (Any flavor) + 2pcs 22oz coffee (Any flavor)",
    ),
  ]),
  coupleOfCats: menuItem("Couple of Cats", [
    combo(
      "two-tail",
      "Two Tail",
      205,
      "8pcs Squid Takoyaki + 2pcs 16oz soda (Any flavor)",
    ),
    combo(
      "two-paw",
      "Two Paw",
      145,
      "Medium Fries (Any flavor) + 2pcs 12oz coffee (Any flavor)",
    ),
    combo(
      "latte-luna",
      "Latte & Luna",
      175,
      "Nachos + meat + veggies + 2pcs 12oz soda (Any flavor)",
    ),
    combo(
      "sweet",
      "Sweet Kittens",
      205,
      "8pcs Cheese Takoyaki + 1pc 16oz soda (Any flavor) + 1pc 16oz coffee (Any flavor)",
    ),
    combo(
      "duo",
      "Duo Siamese",
      195,
      "8pcs Veggie Takoyaki + 2pcs 16oz coffee (Any flavor)",
    ),
  ]),
  singlePaw: menuItem("Single-Paw-rtner Combos", [
    combo(
      "classy",
      "Classy Cat Combo",
      105,
      "4pcs Cheese Takoyaki + 16oz coffee (Any flavor)",
    ),
    combo(
      "fizzy",
      "Fizzy Kitten Combo",
      65,
      "Small Fries (Any flavor) + 12oz soda (Any flavor)",
    ),
    combo(
      "persian",
      "Persian Combo",
      175,
      "Nachos + Veggies + Meat + 16oz coffee (Any flavor)",
    ),
    combo(
      "kasper",
      "Kasper Combo",
      90,
      "4pcs Squid Takoyaki + 12oz soda (Any flavor)",
    ),
  ]),
};

type Part<K extends ModelPart["kind"]> = Extract<ModelPart, { kind: K }>;

function spec(
  item: MenuItem,
  variantId?: string,
  flavor?: string | null,
): ModelSpec {
  const size = variantId
    ? item.variants.find((entry) => entry.id === variantId)
    : undefined;
  const result = modelSpecFor(item, size, flavor);
  if (!result) throw new Error(`no model for ${item.name}`);
  return result;
}

function part<K extends ModelPart["kind"]>(shape: ModelSpec, kind: K) {
  expect(shape.kind).toBe(kind);
  return shape as unknown as Part<K>;
}

function comboParts(shape: ModelSpec): ReadonlyArray<ModelPart> {
  if (shape.kind !== "combo") throw new Error(`not a combo: ${shape.kind}`);
  return shape.parts;
}

describe("Menu 3D models (TC-P4-040 – TC-P4-043)", () => {
  it("TC-P4-040 — every live menu item has a 3D model of its own kind", () => {
    const kinds: Array<[MenuItem, ModelSpec["kind"]]> = [
      [live.carbo, "noodles"],
      [live.cheese, "noodles"],
      [live.sedaap, "noodles"],
      [live.sedaapSpicy, "noodles"],
      [live.treats, "cat-treats"],
      [live.box, "takeout-box"],
      [live.fries, "fries"],
      [live.nachos, "nachos"],
      [live.takoyaki, "takoyaki"],
      [live.coffee, "cup"],
      [live.matcha, "cup"],
      [live.oreo, "cup"],
      [live.soda, "cup"],
      [live.catAssociation, "combo"],
      [live.coupleOfCats, "combo"],
      [live.singlePaw, "combo"],
    ];
    expect(kinds).toHaveLength(16);
    for (const [item, kind] of kinds) {
      const shape = modelSpecFor(item);
      expect(shape?.kind, item.name).toBe(kind);
      expect(shape?.glow, item.name).toMatch(/^#[0-9a-f]{6}$/i);
      // every size of every item builds a model
      for (const size of item.variants) {
        expect(modelSpecFor(item, size), `${item.name} ${size.name}`).not.toBe(
          null,
        );
      }
    }
    // the noodles keep their own looks, and names match exactly
    expect(part(spec(live.carbo), "noodles").style).toBe("carbo");
    expect(part(spec(live.cheese), "noodles").style).toBe("cheese");
    expect(part(spec(live.sedaap), "noodles").style).toBe("sedaap");
    expect(part(spec(live.sedaapSpicy), "noodles").style).toBe("sedaap-spicy");
    expect(
      modelSpecFor(menuItem("Mystery Brew", [variant("r", "Regular", 10)])),
    ).toBeNull();
    expect(
      modelSpecFor(menuItem("Matcha Cake", [variant("r", "Regular", 10)])),
    ).toBeNull();
  });

  it("TC-P4-041 — sizes and flavors change the model, and the key follows", () => {
    // cups grow with the size
    expect(part(spec(live.matcha, "12oz"), "cup").scale).toBe(0.86);
    expect(part(spec(live.matcha, "16oz"), "cup").scale).toBe(1);
    expect(part(spec(live.matcha, "22oz"), "cup").scale).toBe(1.18);

    // matcha: green at the bottom, then the flavor's own top
    const vanilla = part(
      spec(live.matcha, "16oz", "Vanilla Matcha Meow"),
      "cup",
    ).drink;
    expect(vanilla.layers[0]?.[1]).toBe("#6f8f2a");
    expect(vanilla.layers.at(-1)?.[1]).toBe("#f7f0de");
    const dirty = part(spec(live.matcha, "16oz", "Dirty Neko"), "cup").drink;
    expect(dirty.layers[0]?.[1]).toBe("#6f8f2a");
    expect(dirty.layers.at(-1)?.[1]).toBe("#3d2312");
    const caramel = part(
      spec(live.matcha, "16oz", "Caramel Matcha Tail"),
      "cup",
    ).drink;
    expect(caramel.drizzle).not.toBeNull();
    expect(caramel.layers.at(-1)?.[1]).toBe("#93ad3e");

    // oreo: cookie layer, crumbs on top and a flat lid
    const oreo = part(
      spec(live.oreo, "16oz", "Vanilla Oreo Whisker"),
      "cup",
    ).drink;
    expect(oreo).toMatchObject({
      cookieBase: true,
      crumbs: true,
      flatLid: true,
    });
    expect(oreo.speckles).not.toBeNull();

    // soda: clear and fizzy, tinted by flavor
    const kiwi = part(spec(live.soda, "16oz", "Kiwi Kitten"), "cup").drink;
    const grape = part(spec(live.soda, "16oz", "Grumpy Grapes"), "cup").drink;
    expect(kiwi).toMatchObject({ bubbles: true, milky: false });
    expect(kiwi.layers).not.toEqual(grape.layers);

    // takoyaki: count from the size, topping from the flavor
    const tray = part(spec(live.takoyaki), "takoyaki");
    expect(tray).toMatchObject({ count: 4, topping: "veggie" });
    expect(
      part(spec(live.takoyaki, "16pcs", "Squid Treats"), "takoyaki"),
    ).toMatchObject({ count: 16, topping: "squid" });

    // fries: size and seasoning
    expect(part(spec(live.fries), "fries")).toMatchObject({
      size: "small",
      seasoning: null,
    });
    expect(
      part(spec(live.fries, "jumbo", "Spicy Claw"), "fries"),
    ).toMatchObject({ size: "jumbo", seasoning: "spicy" });

    // noodles: add-ons and heat
    expect(part(spec(live.carbo, "egg"), "noodles")).toMatchObject({
      egg: true,
      milk: false,
    });
    expect(part(spec(live.cheese, "milk"), "noodles")).toMatchObject({
      egg: false,
      milk: true,
    });
    expect(
      part(spec(live.sedaapSpicy, "regular", "3 Paws (Extra Hot)"), "noodles")
        .heat,
    ).toBe(3);
    expect(
      part(spec(live.sedaapSpicy, "regular", "1 Paw (Mild)"), "noodles").heat,
    ).toBe(1);

    // nachos: what's on the boat
    expect(part(spec(live.nachos, "nfm"), "nachos")).toMatchObject({
      meat: true,
      veggies: false,
      fries: true,
    });

    // the same pick always means the same model; a new pick a new one
    expect(spec(live.matcha, "16oz", "Dirty Neko").key).toBe(
      spec(live.matcha, "16oz", "Dirty Neko").key,
    );
    expect(spec(live.matcha, "16oz", "Dirty Neko").key).not.toBe(
      spec(live.matcha, "16oz", "Vanilla Matcha Meow").key,
    );
    expect(spec(live.matcha, "12oz", "Dirty Neko").key).not.toBe(
      spec(live.matcha, "22oz", "Dirty Neko").key,
    );
  });

  it("TC-P4-042 — combos are built from their package contents", () => {
    const scaredy = comboParts(spec(live.catAssociation, "scaredy"));
    expect(scaredy).toContainEqual({
      kind: "takoyaki",
      count: 16,
      topping: "veggie",
    });
    expect(scaredy).toContainEqual({
      kind: "fries",
      size: "jumbo",
      seasoning: null,
    });
    // four sodas show as two cups, at the 12oz size
    const sodas = scaredy.filter((entry) => entry.kind === "cup");
    expect(sodas).toHaveLength(2);
    for (const cup of sodas) {
      expect(cup).toMatchObject({ scale: 0.86, drink: { bubbles: true } });
    }

    const lazy = comboParts(spec(live.catAssociation, "lazy"));
    expect(lazy.filter((entry) => entry.kind === "cup")).toHaveLength(4);
    expect(lazy).toContainEqual({
      kind: "takoyaki",
      count: 12,
      topping: "cheese",
    });

    const persian = comboParts(spec(live.singlePaw, "persian"));
    expect(persian).toContainEqual({
      kind: "nachos",
      meat: true,
      veggies: true,
      fries: false,
    });
    expect(persian.filter((entry) => entry.kind === "cup")).toHaveLength(1);

    const twoPaw = comboParts(spec(live.coupleOfCats, "two-paw"));
    expect(twoPaw).toContainEqual({
      kind: "fries",
      size: "medium",
      seasoning: null,
    });
    expect(
      twoPaw.filter((entry) => entry.kind === "cup" && entry.scale === 0.86),
    ).toHaveLength(2);

    // a package that names nothing we can build has no model
    expect(
      modelSpecFor(
        menuItem("Cat Association", [
          combo("mystery", "Mystery Box", 100, "A surprise from the shop"),
        ]),
      ),
    ).toBeNull();
  });

  it("TC-P4-043 — sizes priced per flavor start on their first flavor", () => {
    expect(defaultFlavor(live.takoyaki, live.takoyaki.variants[0])).toBe(
      "Veggie Whiskers",
    );
    // optional flavors start on the standard look
    expect(defaultFlavor(live.matcha, live.matcha.variants[0])).toBeNull();
    expect(defaultFlavor(live.fries, live.fries.variants[3])).toBeNull();
    expect(defaultFlavor(live.takoyaki, null)).toBeNull();
  });
});
