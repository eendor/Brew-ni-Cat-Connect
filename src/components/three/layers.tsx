"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";

import { useThreeEnabled } from "./use-three-enabled";

const MenuTilesCanvas = dynamic(() => import("./canvas/menu-tiles-canvas"), {
  ssr: false,
});
const CartFxCanvas = dynamic(() => import("./canvas/cart-fx-canvas"), {
  ssr: false,
});

/**
 * 3D photo tiles over the real menu cards (Menu page only). Portalled to
 * <body>: the page-enter animation on the route template would otherwise
 * become the containing block of this fixed, viewport-sized canvas.
 */
export function MenuTilesLayer() {
  const enabled = useThreeEnabled();
  return enabled ? createPortal(<MenuTilesCanvas />, document.body) : null;
}

/** Site-wide 3D basket in the cart button plus the add-to-cart toss. */
export function CartFxLayer() {
  const enabled = useThreeEnabled();
  return enabled ? <CartFxCanvas /> : null;
}
