/**
 * Remembers the order a customer left to play games, so the games page can
 * link back to it (FR-089). Only same-site order links are kept, so the saved
 * value can never send someone to another site.
 */
export const WAITING_ORDER_KEY = "bnc-waiting-order";

const ORDER_LINK = /^\/orders\/[A-Za-z0-9_-]+(#[A-Za-z0-9_=&.-]*)?$/;

export function isOrderLink(value: unknown): value is string {
  return typeof value === "string" && ORDER_LINK.test(value);
}

export function rememberWaitingOrder(link: string): void {
  if (!isOrderLink(link)) return;
  try {
    window.sessionStorage.setItem(WAITING_ORDER_KEY, link);
  } catch {
    // storage can be blocked; the back button still works
  }
}

export function readWaitingOrder(): string | null {
  try {
    const value = window.sessionStorage.getItem(WAITING_ORDER_KEY);
    return isOrderLink(value) ? value : null;
  } catch {
    return null;
  }
}

/** Order statuses where the customer is still waiting on the shop. */
const WAITING_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "accepted",
  "preparing",
]);

export function isWaitingForShop(status: string): boolean {
  return WAITING_STATUSES.has(status);
}
