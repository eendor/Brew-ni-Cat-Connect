"use client";

import dynamic from "next/dynamic";

import { useThreeEnabled } from "./use-three-enabled";

const CartFxCanvas = dynamic(() => import("./canvas/cart-fx-canvas"), {
  ssr: false,
});

/** Site-wide 3D basket in the cart button plus the add-to-cart toss. */
export function CartFxLayer() {
  const enabled = useThreeEnabled();
  return enabled ? <CartFxCanvas /> : null;
}
