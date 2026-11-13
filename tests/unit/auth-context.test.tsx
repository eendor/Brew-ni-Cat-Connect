import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import {
  AuthProvider,
  oauthCallbackUrl,
  useAuth,
} from "@/context/auth-context";

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

function TestConsumer({ returnTo }: { returnTo?: string }) {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();
  const [startError, setStartError] = useState("");

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="user-email">{user ? user.email : "guest"}</div>
      <div data-testid="start-error">{startError}</div>
      <button
        onClick={async () => {
          const res = await signInWithGoogle(returnTo);
          setStartError(res.error ? res.error.message : "none");
        }}
        data-testid="google-btn"
      >
        Google
      </button>
      <button onClick={() => signOut()} data-testid="signout-btn">
        Sign Out
      </button>
    </div>
  );
}

describe("AuthContext and useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockSupabase(overrides?: Partial<SupabaseClient["auth"]>) {
    let authCallback:
      ((event: string, session: Session | null) => void) | null = null;

    const mockAuth = {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockImplementation((cb) => {
        authCallback = cb;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { provider: "google", url: "https://accounts.example/auth" },
        error: null,
      }),
      signOut: vi.fn().mockImplementation(async () => {
        if (authCallback) {
          authCallback("SIGNED_OUT", null);
        }
        return { error: null };
      }),
      ...overrides,
    };

    return {
      client: { auth: mockAuth } as unknown as SupabaseClient,
      triggerAuthStateChange: (event: string, session: Session | null) => {
        if (authCallback) {
          authCallback(event, session);
        }
      },
      mockAuth,
    };
  }

  it("TC-P4-149 — starts with no user and finishes loading", async () => {
    const { client } = createMockSupabase();

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });
    expect(screen.getByTestId("user-email").textContent).toBe("guest");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("TC-P4-150 — restores a still-valid session on reload (FR-036)", async () => {
    const validUser: User = {
      id: "user-123",
      email: "customer@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    const validSession: Session = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: validUser,
    };

    const { client } = createMockSupabase({
      getSession: vi.fn().mockResolvedValue({
        data: { session: validSession },
        error: null,
      }),
    });

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });
    expect(screen.getByTestId("user-email").textContent).toBe(
      "customer@example.com",
    );
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("TC-P4-151 — clears an expired session to guest on reload without redirecting (FR-036)", async () => {
    const expiredUser: User = {
      id: "user-expired",
      email: "expired@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    const expiredSession: Session = {
      access_token: "mock-expired-token",
      refresh_token: "mock-expired-refresh",
      expires_in: 0,
      expires_at: Math.floor(Date.now() / 1000) - 60, // expired 60 seconds ago
      token_type: "bearer",
      user: expiredUser,
    };

    const { client } = createMockSupabase({
      getSession: vi.fn().mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      }),
    });

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });
    expect(screen.getByTestId("user-email").textContent).toBe("guest");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("TC-P5-213 — signInWithGoogle starts Google OAuth back to /account/callback (ADR-030)", async () => {
    const user = userEvent.setup();
    const { client, mockAuth } = createMockSupabase();

    render(
      <AuthProvider client={client}>
        <TestConsumer returnTo="/account/orders" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });

    await user.click(screen.getByTestId("google-btn"));

    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account/callback?returnTo=%2Faccount%2Forders`,
        queryParams: { prompt: "select_account" },
      },
    });
    await waitFor(() => {
      expect(screen.getByTestId("start-error").textContent).toBe("none");
    });
  });

  it("TC-P5-214 — signInWithGoogle returns the error when Google sign-in can't start", async () => {
    const user = userEvent.setup();
    const { client } = createMockSupabase({
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { provider: "google", url: null },
        error: new Error("Unsupported provider: provider is not enabled"),
      }),
    });

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });
    await user.click(screen.getByTestId("google-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("start-error").textContent).toBe(
        "Unsupported provider: provider is not enabled",
      );
    });
  });

  it("TC-P5-215 — oauthCallbackUrl leaves out returnTo for the home page", () => {
    expect(oauthCallbackUrl("https://shop.example")).toBe(
      "https://shop.example/account/callback",
    );
    expect(oauthCallbackUrl("https://shop.example", "/")).toBe(
      "https://shop.example/account/callback",
    );
    expect(oauthCallbackUrl("https://shop.example", "/menu?x=1")).toBe(
      "https://shop.example/account/callback?returnTo=%2Fmenu%3Fx%3D1",
    );
  });

  it("TC-P4-154 — signOut terminates session and clears user (FR-033)", async () => {
    const user = userEvent.setup();
    const existingUser: User = {
      id: "user-1",
      email: "user@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    let authChangeCb:
      ((event: string, session: Session | null) => void) | null = null;

    const { client, mockAuth } = createMockSupabase({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "token",
            refresh_token: "refresh",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user: existingUser,
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockImplementation((cb) => {
        authChangeCb = cb;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }),
      signOut: vi.fn().mockImplementation(async () => {
        if (authChangeCb) {
          authChangeCb("SIGNED_OUT", null);
        }
        return { error: null };
      }),
    });

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe(
        "user@example.com",
      );
    });

    await user.click(screen.getByTestId("signout-btn"));

    expect(mockAuth.signOut).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe("guest");
    });
  });

  it("TC-P4-157 — follows SIGNED_IN and SIGNED_OUT events from the auth listener (Google return)", async () => {
    const { client, triggerAuthStateChange } = createMockSupabase();

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });

    const newUser: User = {
      id: "user-event",
      email: "event@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    act(() => {
      triggerAuthStateChange("SIGNED_IN", {
        access_token: "t-recovery",
        refresh_token: "r-recovery",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: newUser,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe(
        "event@example.com",
      );
    });

    act(() => {
      triggerAuthStateChange("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe("guest");
    });
  });
});
