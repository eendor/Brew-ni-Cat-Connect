/**
 * Shared Phase 3 ordering/cart domain types.
 *
 * The Supabase-derived {@link import("@/types/menu").MenuCatalog | MenuCatalog}
 * remains the source of truth for names and prices. Cart records keep a
 * display snapshot plus stable identifiers so a future server can revalidate
 * availability, configuration, and price before order creation.
 *
 * Money is expressed in Philippine pesos as a finite number rounded to two
 * decimals. Cart arithmetic converts through integer centavos to avoid
 * binary floating-point drift.
 *
 * Source-of-truth boundary: the only UI-facing way to add a line is a
 * price-free {@link CartItemSelection} passed to `addCatalogSelection`
 * alongside the current catalog. There is intentionally no public input type
 * carrying `unitPrice`, `itemName`, or `variantName`; those are resolved
 * internally from the catalog so UI code cannot inject an arbitrary or stale
 * price.
 */

export type FulfillmentType = "pickup" | "external-rider";

export type CartItemSelection = Readonly<{
  itemId: string;
  variantId: string;
  /** Selected flavor after trimming; `null` means no flavor was selected. */
  flavor: string | null;
  quantity: number;
}>;

export type CartItem = Readonly<{
  /** Deterministic identity for one item/variant/flavor configuration. */
  key: string;
  itemId: string;
  itemName: string;
  variantId: string;
  variantName: string;
  /** Selected flavor after trimming; `null` means no flavor was selected. */
  flavor: string | null;
  /** Resolved from current menu-derived data, in pesos. */
  unitPrice: number;
  quantity: number;
  /** `unitPrice * quantity`, rounded to two decimals, in pesos. */
  lineTotal: number;
}>;

export type CartState = Readonly<{
  lines: readonly CartItem[];
  fulfillment: FulfillmentType;
}>;

export type OrderDraft = Readonly<{
  lines: readonly CartItem[];
  fulfillment: FulfillmentType;
  /** Sum of all line totals, rounded to two decimals, in pesos. */
  subtotal: number;
  lineCount: number;
  itemCount: number;
}>;

export type AddCartItemFailureReason =
  | "unknown-item"
  | "unknown-variant"
  | "unknown-flavor"
  | "item-unavailable"
  | "availability-unknown"
  | "missing-price"
  | "invalid-quantity";

export type AddCatalogSelectionResult =
  | Readonly<{ ok: true; state: CartState; lineKey: string }>
  | Readonly<{
      ok: false;
      state: CartState;
      reason: AddCartItemFailureReason;
      message: string;
    }>;

export type CartAction =
  | Readonly<{ type: "remove"; key: string }>
  | Readonly<{ type: "update-quantity"; key: string; quantity: number }>
  | Readonly<{ type: "set-fulfillment"; fulfillment: FulfillmentType }>
  | Readonly<{ type: "clear" }>;
