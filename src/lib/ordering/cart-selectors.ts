import { calculateSubtotal } from "@/lib/ordering/cart-pricing";
import type { CartItem, CartState, OrderDraft } from "@/types/ordering";

/**
 * Reusable read-only selectors over {@link CartState}. Every selector is a
 * pure derivation: components render these values instead of recomputing
 * totals or duplicating cart traversal.
 */

export function getCartLines(state: CartState): readonly CartItem[] {
  return state.lines;
}

export function getCartLine(
  state: CartState,
  key: string,
): CartItem | undefined {
  return state.lines.find((line) => line.key === key);
}

export function hasCartLine(state: CartState, key: string): boolean {
  return state.lines.some((line) => line.key === key);
}

/** Number of distinct item/variant/flavor configurations. */
export function getCartLineCount(state: CartState): number {
  return state.lines.length;
}

/** Total units across all lines. */
export function getCartItemCount(state: CartState): number {
  return state.lines.reduce((total, line) => total + line.quantity, 0);
}

/** Sum of all line totals, in pesos. */
export function getCartSubtotal(state: CartState): number {
  return calculateSubtotal(state.lines);
}

export function isCartEmpty(state: CartState): boolean {
  return state.lines.length === 0;
}

/**
 * Build the pre-submission draft snapshot: itemized lines, fulfillment
 * mode, and derived totals. A future checkout/server step must still
 * revalidate this draft against current authoritative data.
 */
export function buildOrderDraft(state: CartState): OrderDraft {
  return {
    lines: state.lines,
    fulfillment: state.fulfillment,
    subtotal: getCartSubtotal(state),
    lineCount: getCartLineCount(state),
    itemCount: getCartItemCount(state),
  };
}
