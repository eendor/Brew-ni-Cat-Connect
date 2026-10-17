/**
 * Bridge between the real cart flow and the 3D cart layer. The order dialog
 * calls `requestCartToss` right after `addItem` succeeds. When the 3D layer
 * is running it animates the item into the basket and returns how long that
 * takes, so the drawer can open once it lands; otherwise it returns 0.
 */
export type CartTossDetail = Readonly<{
  from: Readonly<{ x: number; y: number; width: number; height: number }>;
  photo: string | null;
  glow: string;
  label: string;
}>;

export const CART_TOSS_EVENT = "bnc:cart-toss";
export const CART_TOSS_MS = 420;

type FxWindow = Window & { __bncCartFx?: boolean };

export function setCartFxActive(active: boolean) {
  (window as FxWindow).__bncCartFx = active;
}

export function requestCartToss(detail: CartTossDetail): number {
  if (typeof window === "undefined") return 0;
  if (!(window as FxWindow).__bncCartFx) return 0;
  window.dispatchEvent(new CustomEvent(CART_TOSS_EVENT, { detail }));
  return CART_TOSS_MS;
}
