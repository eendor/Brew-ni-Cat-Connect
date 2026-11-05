import { render, screen } from "@testing-library/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerReplace = vi.fn();
let currentPathname = "/account/profile";
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplace,
    push: vi.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

import { AccountGuard } from "@/components/account/account-guard";
import { AuthProvider } from "@/context/auth-context";

const mockCustomer: User = {
  id: "customer-123",
  email: "customer@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

function createMockAuthClient(user: User | null = mockCustomer) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
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

describe("Account Page Guard (FR-036)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = "/account/profile";
    currentSearchParams = new URLSearchParams();
  });

  it("TC-P4-270 — redirects signed-out visitors from /account/profile to /account/sign-in with returnTo", async () => {
    const client = createMockAuthClient(null);

    render(
      <AuthProvider client={client}>
        <AccountGuard>
          <div data-testid="protected-content">Protected Profile</div>
        </AccountGuard>
      </AuthProvider>,
    );

    // Initial render / while loading or signed out
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

    await vi.waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith(
        "/account/sign-in?returnTo=%2Faccount%2Fprofile",
      );
    });
  });

  it("redirects signed-out visitors from /account/orders preserving query params", async () => {
    const client = createMockAuthClient(null);
    currentPathname = "/account/orders";
    currentSearchParams = new URLSearchParams("page=2");

    render(
      <AuthProvider client={client}>
        <AccountGuard>
          <div data-testid="protected-content">Protected Orders</div>
        </AccountGuard>
      </AuthProvider>,
    );

    await vi.waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith(
        "/account/sign-in?returnTo=%2Faccount%2Forders%3Fpage%3D2",
      );
    });
  });

  it("allows signed-in customers to view protected content", async () => {
    const client = createMockAuthClient(mockCustomer);

    render(
      <AuthProvider client={client}>
        <AccountGuard>
          <div data-testid="protected-content">Protected Profile</div>
        </AccountGuard>
      </AuthProvider>,
    );

    expect(await screen.findByTestId("protected-content")).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("permits public account pages (/account/sign-in, /account/sign-up) without redirect", async () => {
    const client = createMockAuthClient(null);
    currentPathname = "/account/sign-in";

    render(
      <AuthProvider client={client}>
        <AccountGuard>
          <div data-testid="public-content">Sign In Page</div>
        </AccountGuard>
      </AuthProvider>,
    );

    expect(screen.getByTestId("public-content")).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
