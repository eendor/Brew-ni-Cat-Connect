"use client";

import { createContext, useContext, type ReactNode } from "react";

import { fallbackShop } from "@/lib/site-content/fallback-shop";
import type { ShopFacts } from "@/lib/site-content/types";

/**
 * The shop's facts for client components: hours, contact details, address,
 * payments, notice, links, riders and the takeout box price. The root layout
 * reads them on the server and passes them down, so the browser never asks
 * the database for them. Without a provider (unit tests) the fallback copy
 * shows, with no takeout price.
 */
const ShopFactsContext = createContext<ShopFacts>({
  ...fallbackShop,
  takeoutBoxPrice: null,
});

export function ShopFactsProvider({
  facts,
  children,
}: Readonly<{ facts: ShopFacts; children: ReactNode }>) {
  return (
    <ShopFactsContext.Provider value={facts}>
      {children}
    </ShopFactsContext.Provider>
  );
}

export function useShopFacts(): ShopFacts {
  return useContext(ShopFactsContext);
}
