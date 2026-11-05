import { render, screen } from "@testing-library/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/checkout",
  useSearchParams: () => new URLSearchParams(),
}));

import { CheckoutView } from "@/components/checkout/checkout-view";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { ShopFactsProvider } from "@/context/shop-facts-context";
import type { CustomerProfile } from "@/lib/account/profile";
import { fallbackShop } from "@/lib/site-content/fallback-shop";
import type { ShopFacts } from "@/lib/site-content/types";
import type { MenuCatalog } from "@/types/menu";

const mockFacts: ShopFacts = {
  ...fallbackShop,
  takeoutBoxPrice: 10,
};

const mockCatalog: MenuCatalog = {
  categories: [
    {
      id: "coffee",
      name: "Coffee",
      items: [
        {
          id: "americano",
          name: "Americano",
          availability: "available",
          flavors: [],
          variants: [
            {
              id: "regular-12",
              name: "12 oz",
              basePrice: 90,
              flavorPrices: [],
              description: null,
            },
          ],
        },
      ],
    },
  ],
};

const mockCustomer: User = {
  id: "customer-123",
  email: "juan@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

function createMockAuthClient(user: User | null = mockCustomer) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user, access_token: "mock-token" } : null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

describe("Checkout Prefill for Signed-in Customers vs Guest Checkout (FR-023)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-P4-266 — prefills full name and phone number when customer is signed in with a saved profile", async () => {
    const client = createMockAuthClient(mockCustomer);
    const savedProfile: CustomerProfile = {
      userId: "customer-123",
      fullName: "Juan Dela Cruz",
      phone: "+639123456789",
    };

    render(
      <AuthProvider client={client}>
        <ShopFactsProvider facts={mockFacts}>
          <CartProvider
            initialState={{
              lines: [
                {
                  key: "americano::regular-12::",
                  itemId: "americano",
                  itemName: "Americano",
                  variantId: "regular-12",
                  variantName: "12 oz",
                  flavor: null,
                  unitPrice: 90,
                  quantity: 1,
                  lineTotal: 90,
                },
              ],
              fulfillment: "pickup",
            }}
          >
            <CheckoutView
              loadMenu={async () => mockCatalog}
              initialProfile={savedProfile}
            />
          </CartProvider>
        </ShopFactsProvider>
      </AuthProvider>,
    );

    const nameInput = await screen.findByLabelText(/name/i);
    expect(nameInput).toHaveValue("Juan Dela Cruz");

    const phoneInput = screen.getByLabelText(/phone number/i);
    expect(phoneInput).toHaveValue("+639123456789");
  });

  it("TC-P4-267 — guest checkout leaves name and phone fields empty", async () => {
    const client = createMockAuthClient(null);

    render(
      <AuthProvider client={client}>
        <ShopFactsProvider facts={mockFacts}>
          <CartProvider
            initialState={{
              lines: [
                {
                  key: "americano::regular-12::",
                  itemId: "americano",
                  itemName: "Americano",
                  variantId: "regular-12",
                  variantName: "12 oz",
                  flavor: null,
                  unitPrice: 90,
                  quantity: 1,
                  lineTotal: 90,
                },
              ],
              fulfillment: "pickup",
            }}
          >
            <CheckoutView loadMenu={async () => mockCatalog} />
          </CartProvider>
        </ShopFactsProvider>
      </AuthProvider>,
    );

    const nameInput = await screen.findByLabelText(/name/i);
    expect(nameInput).toHaveValue("");

    const phoneInput = screen.getByLabelText(/phone number/i);
    expect(phoneInput).toHaveValue("");
  });
});
