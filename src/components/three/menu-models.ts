import type { MenuItem, MenuVariant } from "@/types/menu";

import { glowForItem } from "./showcase-data";

/**
 * Menu 3D registry: maps a live menu item (plus the picked size and flavor)
 * to the model the Menu 3D viewer builds. Pure data with no three.js import,
 * so a card can decide whether to offer "View in 3D" without loading WebGL.
 */

/** Bottom-to-top color stops of a drink, as [fraction of the fill, hex]. */
export type DrinkStops = ReadonlyArray<readonly [number, string]>;

export type DrinkLook = Readonly<{
  layers: DrinkStops;
  /** Color of the drink's top surface under the lid. */
  surface: string;
  /** Sauce streaks down the inside of the cup. */
  drizzle: string | null;
  /** Dark cookie specks through the body. */
  speckles: string | null;
  /** Crushed cookie layer at the bottom. */
  cookieBase: boolean;
  /** Cookie crumbs on top of the drink. */
  crumbs: boolean;
  /** Rising soda bubbles. */
  bubbles: boolean;
  /** Milky (soft sheen) or clear (glossy) liquid. */
  milky: boolean;
  flatLid: boolean;
}>;

export type TakoyakiTopping = "veggie" | "cheese" | "squid" | "shrimp";
export type FriesSize = "small" | "medium" | "large" | "jumbo";
export type FriesSeasoning = "bbq" | "cheese" | "sour-cream" | "spicy";
export type NoodleStyle = "carbo" | "cheese" | "sedaap" | "sedaap-spicy";

export type ModelPart =
  | Readonly<{ kind: "cup"; scale: number; drink: DrinkLook }>
  | Readonly<{
      kind: "takoyaki";
      count: 4 | 8 | 12 | 16;
      topping: TakoyakiTopping | null;
    }>
  | Readonly<{
      kind: "fries";
      size: FriesSize;
      seasoning: FriesSeasoning | null;
    }>
  | Readonly<{
      kind: "noodles";
      style: NoodleStyle;
      egg: boolean;
      milk: boolean;
      heat: number;
    }>
  | Readonly<{
      kind: "nachos";
      meat: boolean;
      veggies: boolean;
      fries: boolean;
    }>
  | Readonly<{ kind: "cutout"; src: string }>
  | Readonly<{ kind: "takeout-box" }>
  | Readonly<{ kind: "cat-treats" }>
  | Readonly<{ kind: "bottled-water" }>;

export type ModelShape =
  ModelPart | Readonly<{ kind: "combo"; parts: ReadonlyArray<ModelPart> }>;

/** A model to build: the same `key` always means the same model. */
export type ModelSpec = ModelShape & Readonly<{ key: string; glow: string }>;

const GREEN = ["#6f8f2a", "#93ad3e", "#b4c45c"] as const;
const ESPRESSO = ["#8a7440", "#4e2f18", "#3d2312"] as const;
const CREAM = ["#e9dcc4", "#ddc9a8"] as const;
const COFFEE = ["#a57c52", "#6d4425", "#4d2f19"] as const;
const COOKIE = ["#2b1e18", "#3b2b22"] as const;
const CARAMEL = "#b9732c";

/** Soda flavors as [deep, light] tints. */
const sodaTints: ReadonlyArray<readonly [string, readonly [string, string]]> = [
  ["yogurt yarn", ["#e6e0d4", "#f6f3ec"]],
  ["honey peach paws", ["#f08a4b", "#ffc29a"]],
  ["passion fruit purr", ["#f2a516", "#ffd36b"]],
  ["kiwi kitten", ["#6fae2a", "#b5e06a"]],
  ["strawberry scratch", ["#e0284a", "#ff7d90"]],
  ["lychee litter", ["#ead0da", "#fbeef2"]],
  ["blueberry bite", ["#3540b0", "#7a84e6"]],
  ["grumpy grapes", ["#5b2580", "#9a5cc0"]],
  ["green apple alley cat", ["#8cc63a", "#cdef84"]],
];

type ItemKind =
  | "takoyaki"
  | "fries"
  | "carbo"
  | "cheese"
  | "sedaap"
  | "sedaap-spicy"
  | "nachos"
  | "coffee"
  | "matcha"
  | "oreo"
  | "soda"
  | "combo"
  | "takeout-box"
  | "cat-treats"
  | "bottled-water";

/** Exact names, like the photo map: base name or parenthetical nickname. */
const itemKinds: ReadonlyArray<readonly [ItemKind, ReadonlyArray<string>]> = [
  ["takoyaki", ["takoyaki", "pawsome balls"]],
  ["fries", ["fries", "cat claws"]],
  ["carbo", ["buldak carbo"]],
  ["cheese", ["buldak cheese"]],
  ["sedaap", ["sedaap original"]],
  ["sedaap-spicy", ["sedaap spicy chicken"]],
  ["nachos", ["nachos", "kitty litter crisps"]],
  ["coffee", ["cat-feine", "classic coffee"]],
  ["matcha", ["matcha", "the lucky green neko", "lucky green neko"]],
  ["oreo", ["oreo", "the tuxedo cat", "tuxedo cat"]],
  ["soda", ["soda", "fizzy felines"]],
  ["combo", ["cat association", "couple of cats", "single-paw-rtner combos"]],
  ["takeout-box", ["take-out box"]],
  ["cat-treats", ["cat treats"]],
  ["bottled-water", ["bottled water", "bottle of water"]],
];

const kindByName: ReadonlyMap<string, ItemKind> = new Map(
  itemKinds.flatMap(([kind, names]) =>
    names.map((name) => [name, kind] as const),
  ),
);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** "Fries (Cat Claws)" → ["fries", "cat claws"]. */
function nameCandidates(itemName: string): string[] {
  const base = normalize(itemName.replace(/\([^)]*\)/g, " "));
  const nicknames = [...itemName.matchAll(/\(([^)]*)\)/g)].map((match) =>
    normalize(match[1] ?? ""),
  );
  return [base, ...nicknames].filter(Boolean);
}

function itemKind(itemName: string): ItemKind | null {
  for (const candidate of nameCandidates(itemName)) {
    const kind = kindByName.get(candidate);
    if (kind) {
      return kind;
    }
  }
  return null;
}

function look(
  layers: DrinkStops,
  options: Partial<Omit<DrinkLook, "layers">> = {},
): DrinkLook {
  return {
    layers,
    surface: options.surface ?? layers[layers.length - 1]?.[1] ?? "#ffffff",
    drizzle: options.drizzle ?? null,
    speckles: options.speckles ?? null,
    cookieBase: options.cookieBase ?? false,
    crumbs: options.crumbs ?? false,
    bubbles: options.bubbles ?? false,
    milky: options.milky ?? true,
    flatLid: options.flatLid ?? false,
  };
}

function matchaLook(flavor: string): DrinkLook {
  if (flavor.includes("dirty")) {
    return look([
      [0, GREEN[0]],
      [0.36, GREEN[1]],
      [0.48, CREAM[0]],
      [0.64, CREAM[1]],
      [0.74, ESPRESSO[0]],
      [0.86, ESPRESSO[1]],
      [1, ESPRESSO[2]],
    ]);
  }
  if (flavor.includes("vanilla")) {
    return look([
      [0, GREEN[0]],
      [0.42, GREEN[1]],
      [0.6, GREEN[2]],
      [0.7, "#efe5cf"],
      [1, "#f7f0de"],
    ]);
  }
  if (flavor.includes("salted caramel")) {
    return look(
      [
        [0, GREEN[0]],
        [0.4, GREEN[1]],
        [0.54, CREAM[0]],
        [0.74, "#d8b989"],
        [1, "#c08a4a"],
      ],
      { drizzle: CARAMEL },
    );
  }
  if (flavor.includes("caramel")) {
    return look(
      [
        [0, GREEN[0]],
        [0.38, GREEN[1]],
        [0.5, CREAM[0]],
        [0.68, CREAM[1]],
        [0.8, GREEN[2]],
        [1, GREEN[1]],
      ],
      { drizzle: CARAMEL },
    );
  }
  // Standard: the card photo's dirty matcha with an espresso top.
  return look([
    [0, GREEN[0]],
    [0.45, GREEN[1]],
    [0.68, GREEN[2]],
    [0.78, ESPRESSO[0]],
    [0.86, ESPRESSO[1]],
    [1, ESPRESSO[2]],
  ]);
}

function oreoLook(flavor: string): DrinkLook {
  const oreo = (
    body: readonly [string, string],
    drizzle: string | null = null,
  ) =>
    look(
      [
        [0, COOKIE[0]],
        [0.13, COOKIE[1]],
        [0.19, body[0]],
        [1, body[1]],
      ],
      {
        drizzle,
        speckles: "#2a1f1a",
        cookieBase: true,
        crumbs: true,
        flatLid: true,
      },
    );
  if (flavor.includes("paw-tte")) {
    return oreo(["#b8916a", "#d9c2a0"]);
  }
  if (flavor.includes("caramel")) {
    return oreo(["#e0caa6", "#ecdcc0"], CARAMEL);
  }
  // Standard and Vanilla Oreo Whisker: the light card-photo look.
  return oreo(["#e3d8c3", "#f3ecdd"]);
}

function coffeeLook(flavor: string): DrinkLook {
  const latte = (
    milk: readonly [string, string],
    coffee: readonly [string, string, string],
    drizzle: string | null = null,
  ) =>
    look(
      [
        [0, milk[0]],
        [0.45, milk[1]],
        [0.58, coffee[0]],
        [0.7, coffee[1]],
        [1, coffee[2]],
      ],
      { drizzle },
    );
  if (flavor.includes("meow-chiato")) {
    return look(
      [
        [0, "#ece1cb"],
        [0.5, "#e1cfb0"],
        [0.62, "#b98f62"],
        [0.74, ESPRESSO[1]],
        [1, ESPRESSO[2]],
      ],
      { drizzle: CARAMEL },
    );
  }
  if (flavor.includes("salted caramel")) {
    return latte(CREAM, ["#b4844f", "#7a4c26", "#5a3820"], CARAMEL);
  }
  if (flavor.includes("vanilla")) {
    return latte(["#f1e7d3", "#e8dbc2"], COFFEE);
  }
  if (flavor.includes("hazelnut")) {
    return latte(["#e6d3b6", "#d6bd98"], ["#9c6f45", "#6a4022", "#4a2b16"]);
  }
  if (flavor.includes("siamese")) {
    return look([
      [0, "#d9c2a0"],
      [0.5, "#c8a682"],
      [1, "#b48d66"],
    ]);
  }
  return latte(CREAM, COFFEE);
}

/** Soda [deep, light] tint; Passion Fruit when no flavor is picked. */
function sodaTint(flavor: string): readonly [string, string] {
  const match = sodaTints.find(([name]) =>
    flavor.includes(name.split(" ")[0] ?? name),
  );
  return match?.[1] ?? ["#f2a516", "#ffd36b"];
}

function sodaLook(flavor: string): DrinkLook {
  const [deep, light] = sodaTint(flavor);
  return look(
    [
      [0, deep],
      [0.7, light],
      [1, light],
    ],
    { bubbles: true, milky: false },
  );
}

function cupScale(text: string): number {
  const ounces = Number(/(\d+)\s*oz/i.exec(text)?.[1] ?? 16);
  if (ounces <= 12) return 0.86;
  if (ounces >= 22) return 1.18;
  return 1;
}

const takoyakiCounts = [4, 8, 12, 16] as const;

function takoyakiCount(text: string): 4 | 8 | 12 | 16 {
  const pieces = Number(/(\d+)\s*pcs?/i.exec(text)?.[1] ?? 8);
  return takoyakiCounts.reduce<4 | 8 | 12 | 16>(
    (best, count) =>
      Math.abs(count - pieces) < Math.abs(best - pieces) ? count : best,
    8,
  );
}

function takoyakiTopping(text: string): TakoyakiTopping | null {
  if (/veggie/i.test(text)) return "veggie";
  if (/chees/i.test(text)) return "cheese";
  if (/squid/i.test(text)) return "squid";
  if (/shrimp/i.test(text)) return "shrimp";
  return null;
}

function friesSize(text: string): FriesSize {
  const size = /(small|medium|large|jumbo)/i.exec(text)?.[1]?.toLowerCase();
  return size === "small" || size === "large" || size === "jumbo"
    ? size
    : "medium";
}

function friesSeasoning(text: string): FriesSeasoning | null {
  if (/bbq/i.test(text)) return "bbq";
  if (/chees/i.test(text)) return "cheese";
  if (/sour/i.test(text)) return "sour-cream";
  if (/spicy/i.test(text)) return "spicy";
  return null;
}

/** Combo contents read from the package description, two cups per type at most. */
function comboParts(description: string): ModelPart[] {
  const parts: ModelPart[] = [];
  const takoyaki =
    /(\d+)\s*pcs?\s+(veggie|cheese|cheesy|squid|shrimp)?\s*takoyaki/i.exec(
      description,
    );
  if (takoyaki) {
    parts.push({
      kind: "takoyaki",
      count: takoyakiCount(takoyaki[0]),
      topping: takoyakiTopping(takoyaki[2] ?? ""),
    });
  }
  if (/\bfries\b/i.test(description)) {
    const size = /(small|medium|large|jumbo)\s+fries/i.exec(description);
    parts.push({
      kind: "fries",
      size: friesSize(size?.[1] ?? "medium"),
      seasoning: null,
    });
  }
  if (/nachos/i.test(description)) {
    parts.push({
      kind: "nachos",
      meat: /\bmeat\b/i.test(description),
      veggies: /\bveggies\b/i.test(description),
      fries: false,
    });
  }
  const cups = { soda: 0, coffee: 0 };
  for (const match of description.matchAll(
    /(?:(\d+)\s*pcs?\s+)?(12|16|22)\s*oz\s+(soda|coffee)/gi,
  )) {
    const type = match[3]?.toLowerCase() === "soda" ? "soda" : "coffee";
    const count = Number(match[1] ?? 1);
    for (let index = 0; index < count && cups[type] < 2; index++) {
      const drink =
        type === "soda"
          ? sodaLook(cups.soda === 0 ? "passion fruit" : "strawberry")
          : coffeeLook("");
      parts.push({ kind: "cup", scale: cupScale(`${match[2]}oz`), drink });
      cups[type] += 1;
    }
  }
  return parts;
}

/**
 * The flavor shown before a guest picks one. Items priced per flavor
 * (Takoyaki) start on the first flavor the menu lists for that size; the
 * size's prices arrive sorted by name, so their order isn't the menu's.
 * Optional flavors start on none, which shows the standard look from the
 * card photo.
 */
export function defaultFlavor(
  item: MenuItem,
  variant: MenuVariant | null | undefined,
): string | null {
  if (variant && variant.basePrice === 0 && variant.flavorPrices.length > 0) {
    const priced = new Set(variant.flavorPrices.map((entry) => entry.flavor));
    return (
      item.flavors.find((flavor) => priced.has(flavor)) ??
      variant.flavorPrices[0]?.flavor ??
      null
    );
  }
  return null;
}

function withMeta(shape: ModelShape, glow: string): ModelSpec {
  return { ...shape, key: JSON.stringify(shape), glow } as ModelSpec;
}

/**
 * The 3D model for an item, its size (variant) and flavor, or null when the
 * item has no model. Size defaults to the first variant; leaving `flavor`
 * undefined uses `defaultFlavor`.
 */
export function modelSpecFor(
  item: MenuItem,
  variant?: MenuVariant | null,
  flavor?: string | null,
): ModelSpec | null {
  const kind = itemKind(item.name);
  if (!kind) {
    return null;
  }
  const size = variant ?? item.variants[0] ?? null;
  const picked = normalize(
    (flavor === undefined ? defaultFlavor(item, size) : flavor) ?? "",
  );
  const sizeName = size?.name ?? "";
  const glow = glowForItem(item.name);

  switch (kind) {
    case "matcha":
      return withMeta(
        { kind: "cup", scale: cupScale(sizeName), drink: matchaLook(picked) },
        glow,
      );
    case "oreo":
      return withMeta(
        { kind: "cup", scale: cupScale(sizeName), drink: oreoLook(picked) },
        glow,
      );
    case "coffee":
      return withMeta(
        { kind: "cup", scale: cupScale(sizeName), drink: coffeeLook(picked) },
        glow,
      );
    case "soda":
      return withMeta(
        { kind: "cup", scale: cupScale(sizeName), drink: sodaLook(picked) },
        sodaTint(picked)[1],
      );
    case "takoyaki":
      return withMeta(
        {
          kind: "takoyaki",
          count: takoyakiCount(sizeName),
          topping: takoyakiTopping(picked),
        },
        glow,
      );
    case "fries":
      return withMeta(
        {
          kind: "fries",
          size: friesSize(sizeName),
          seasoning: friesSeasoning(picked),
        },
        glow,
      );
    case "carbo":
    case "cheese":
    case "sedaap":
    case "sedaap-spicy":
      return withMeta(
        {
          kind: "noodles",
          style: kind,
          egg: /egg/i.test(sizeName),
          milk: /milk/i.test(sizeName),
          heat:
            kind === "sedaap-spicy"
              ? Number(/(\d)\s*paws?/i.exec(picked)?.[1] ?? 2)
              : 0,
        },
        glow,
      );
    case "nachos":
      return withMeta(
        {
          kind: "nachos",
          meat: /meat/i.test(sizeName),
          veggies: /veggies/i.test(sizeName),
          fries: /fries/i.test(sizeName),
        },
        glow,
      );
    case "combo": {
      const parts = comboParts(size?.description ?? "");
      return parts.length > 0 ? withMeta({ kind: "combo", parts }, glow) : null;
    }
    case "takeout-box":
      return withMeta({ kind: "takeout-box" }, glow);
    case "cat-treats":
      return withMeta({ kind: "cat-treats" }, glow);
    case "bottled-water":
      return withMeta({ kind: "bottled-water" }, "#5EE1FF");
  }
}

const DRINK_CATEGORY = /drink|beverage|coffee|soda|tea|water|latte|juice/i;

/**
 * The model shown on a Menu card. Items with a hand-built model use it; any
 * other item, such as one the owner adds later, gets a generic stand-in by
 * category so every card floats in 3D without waiting for a redeploy.
 */
export function menuModelSpec(
  item: MenuItem,
  categoryName: string,
  variant?: MenuVariant | null,
  flavor?: string | null,
): ModelSpec {
  const built = modelSpecFor(item, variant, flavor);
  if (built) {
    return built;
  }
  const glow = glowForItem(item.name);
  if (DRINK_CATEGORY.test(categoryName)) {
    const size = variant ?? item.variants[0] ?? null;
    const generic = look(
      [
        [0, "#c9a27a"],
        [0.6, "#e7d3b8"],
        [1, "#f3e8d8"],
      ],
      { milky: true },
    );
    return withMeta(
      { kind: "cup", scale: cupScale(size?.name ?? ""), drink: generic },
      glow,
    );
  }
  return withMeta({ kind: "takeout-box" }, glow);
}

/** A floating cut-out of the item's photo, glowing like a built model. */
export function cutoutSpec(item: MenuItem, src: string): ModelSpec {
  return withMeta({ kind: "cutout", src }, glowForItem(item.name));
}
