"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { useThreeEnabled } from "./use-three-enabled";

const CartFxCanvas = dynamic(() => import("./canvas/cart-fx-canvas"), {
  ssr: false,
});

/**
 * Add-to-cart toss into the header cart button. Items are only added from
 * the menu's order dialog, so the layer only runs on the menu page.
 */
export function CartFxLayer() {
  const enabled = useThreeEnabled();
  const onMenu = usePathname() === "/menu";
  return enabled && onMenu ? <CartFxCanvas /> : null;
}
