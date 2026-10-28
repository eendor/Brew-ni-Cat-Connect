/**
 * The order summary a visitor prepares at checkout. Once it is made it holds
 * the order, so the cart empties (ADR-020); the checkout shows it until the
 * visitor edits it or starts a new order, and the empty cart links back to it.
 */
import { useSyncExternalStore } from "react";

import {
  getStoredSummary,
  subscribeStoredSummary,
} from "@/lib/ordering/summary-storage";
import type { CartItem, FulfillmentType } from "@/types/ordering";

export type CustomerDetails = Readonly<{
  name: string;
  phone: string;
  /** Where the rider delivers. Empty for pickup; missing in summaries
   *  saved before rider delivery existed. */
  address?: string;
  notes: string;
  paymentPreference: "Cash" | "GCash";
}>;

export type PreparedOrderSummary = Readonly<{
  createdAt: string;
  customer: CustomerDetails;
  fulfillment: FulfillmentType;
  lines: readonly CartItem[];
  subtotal: number;
  itemCount: number;
}>;

/** Shape check for a summary read back from storage. */
function isPreparedSummary(value: unknown): value is PreparedOrderSummary {
  if (typeof value !== "object" || value === null) return false;
  const summary = value as Partial<PreparedOrderSummary>;
  const customer = summary.customer as Partial<CustomerDetails> | undefined;
  return (
    typeof summary.createdAt === "string" &&
    typeof summary.subtotal === "number" &&
    typeof summary.itemCount === "number" &&
    (summary.fulfillment === "pickup" ||
      summary.fulfillment === "external-rider") &&
    typeof customer?.name === "string" &&
    typeof customer.phone === "string" &&
    typeof customer.notes === "string" &&
    (customer.address === undefined || typeof customer.address === "string") &&
    (customer.paymentPreference === "Cash" ||
      customer.paymentPreference === "GCash") &&
    Array.isArray(summary.lines) &&
    summary.lines.every(
      (line: Partial<CartItem> | null) =>
        typeof line?.key === "string" &&
        typeof line.itemName === "string" &&
        typeof line.variantName === "string" &&
        typeof line.quantity === "number" &&
        typeof line.unitPrice === "number" &&
        typeof line.lineTotal === "number",
    )
  );
}

const readPreparedSummary = () => getStoredSummary(isPreparedSummary);

/** The order summary saved in this tab, or null. */
export function usePreparedSummary(): PreparedOrderSummary | null {
  return useSyncExternalStore(
    subscribeStoredSummary,
    readPreparedSummary,
    () => null,
  );
}
