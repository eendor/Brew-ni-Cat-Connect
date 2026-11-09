/**
 * Made-up shop facts, menu and order for the Messenger assistant's tests.
 * None of it is the shop's real data, so the tests don't change when the
 * owner edits the site content or the menu.
 */

import type { OrderStatus, OrderView } from "@/lib/orders/types";
import { fallbackSiteContent } from "@/lib/site-content/load";
import type { SiteContent } from "@/lib/site-content/types";
import type {
  FlavorPrice,
  MenuCatalog,
  MenuItem,
  MenuVariant,
} from "@/types/menu";

export const ORIGIN = "https://brew.example";
export const PAGE = "900000000000001";
export const CUSTOMER = "7100000000000001";
export const OTHER_CUSTOMER = "7100000000000002";
export const REFERENCE = "BNC-7K2Q9F";
/** 43 characters, like a real tracking token. Not a real one. */
export const TOKEN = "Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC10b2tlbg8";
export const ORDER_LINK = `${ORIGIN}/orders/${REFERENCE}#token=${TOKEN}`;
export const NOW = Date.UTC(2026, 10, 9, 6, 0, 0);

const open = (opens: string, closes: string) => ({ opens, closes });

export const content: SiteContent = {
  ...fallbackSiteContent,
  hours: {
    days: {
      monday: open("10:00", "18:00"),
      tuesday: open("10:00", "18:00"),
      wednesday: open("10:00", "18:00"),
      thursday: open("10:00", "18:00"),
      friday: open("10:00", "18:00"),
      saturday: null,
      sunday: open("12:00", "17:00"),
    },
    note: "Changes are posted on our page.",
  },
  address: {
    street: "1 Sample St",
    area: "Sample Area",
    town: "Sample Town",
    province: "Sample Province",
    postalCode: "1000",
    country: "Philippines",
    landmark: "Beside the sample park",
    mapUrl: "https://maps.example/shop",
  },
  payments: { methods: ["Cash", "Maya"], qrCode: null },
  notice: { text: "Closed on June 12 for a holiday." },
  riders: {
    partners: [
      {
        name: "Rider One",
        href: "https://riders.example/one",
        logo: "/images/riders/one.png",
      },
      {
        name: "Rider Two",
        href: "https://riders.example/two",
        logo: "/images/riders/two.png",
      },
    ],
  },
};

export function variant(
  name: string,
  basePrice: number | null,
  flavorPrices: readonly FlavorPrice[] = [],
): MenuVariant {
  return { id: `v_${name}`, name, basePrice, flavorPrices, description: null };
}

export function item(
  name: string,
  variants: readonly MenuVariant[],
  extra: Partial<MenuItem> = {},
): MenuItem {
  return {
    id: `i_${name}`,
    name,
    availability: "available",
    flavors: [],
    variants,
    ...extra,
  };
}

export const catalog: MenuCatalog = {
  categories: [
    {
      id: "cat_drinks",
      name: "Cat-Tastic Drinks",
      items: [
        item("Iced Latte", [variant("16oz", 49), variant("22oz", 59)]),
        item("Matcha", [variant("Regular", 65)], {
          flavors: ["Strawberry", "Mango"],
        }),
      ],
    },
    {
      id: "cat_bites",
      name: "Cat-Tastic Bites",
      items: [
        item(
          "Fries",
          [
            variant("Solo", 0, [
              { flavor: "Cheese", price: 45 },
              { flavor: "Barbecue", price: 49 },
            ]),
          ],
          { flavors: ["Cheese", "Barbecue"] },
        ),
        item(
          "Snack Combo",
          [variant("Fries+Drink", 99), variant("Nachos+Drink", 129.5)],
          { availability: "unavailable" },
        ),
      ],
    },
    { id: "cat_seasonal", name: "Seasonal", items: [] },
  ],
};

export function order(status: OrderStatus): OrderView {
  return {
    reference: REFERENCE,
    status,
    fulfillment: "pickup",
    customerName: "Test Customer",
    paymentPreference: "Cash",
    notes: "No ice please",
    items: [
      {
        itemId: "i_latte",
        itemName: "Iced Latte",
        variantId: "v_16oz",
        variantName: "16oz",
        flavor: null,
        unitPrice: 49,
        quantity: 2,
        lineTotal: 98,
      },
    ],
    subtotal: 98,
    itemCount: 2,
    rejectionReason: null,
    createdAt: "2026-11-09T05:50:00.000Z",
    statusHistory: [
      { status: "pending", changedAt: "2026-11-09T05:50:00.000Z" },
    ],
    realtimeTopic: "order-status-test",
  };
}
