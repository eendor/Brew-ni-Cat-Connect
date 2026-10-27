import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { AuthProvider, useAuth } from "@/context/auth-context";

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

function TestConsumer() {
  const {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="user-email">{user ? user.email : "guest"}</div>
      <button
        onClick={() => signUp("new@example.com", "Password123!")}
        data-testid="signup-btn"
      >
        Sign Up
      </button>
      <button
        onClick={() => signIn("test@example.com", "Password123!")}
        data-testid="signin-btn"
      >
        Sign In
      </button>
      <button onClick={() => signOut()} data-testid="signout-btn">
        Sign Out
      </button>
      <button
        onClick={() => resetPassword("reset@example.com")}
        data-testid="reset-btn"
      >
        Reset Password
      </button>
      <button
        onClick={() => updatePassword("NewPassword123!")}
        data-testid="update-pw-btn"
      >
        Update Password
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
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockImplementation(async () => {
        return {
          data: { user: null, session: null },
          error: null,
        };
      }),
      signOut: vi.fn().mockImplementation(async () => {
        if (authCallback) {
          authCallback("SIGNED_OUT", null);
        }
        return { error: null };
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
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

  it("TC-P4-AUTH-001 — starts with no user and finishes loading", async () => {
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

  it("TC-P4-AUTH-002 — restores a still-valid session on reload (FR-036)", async () => {
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

  it("TC-P4-AUTH-003 — sends an expired session to sign in on reload (FR-036)", async () => {
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
    expect(routerPush).toHaveBeenCalledWith("/account/sign-in");
  });

  it("TC-P4-AUTH-004 — signUp builds emailRedirectTo from origin (FR-031, FR-035)", async () => {
    const user = userEvent.setup();
    const { client, mockAuth } = createMockSupabase();

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });

    await user.click(screen.getByTestId("signup-btn"));

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "Password123!",
      options: {
        emailRedirectTo: `${window.location.origin}/account/sign-in`,
      },
    });
  });

  it("TC-P4-AUTH-005 — signIn updates user on success (FR-032)", async () => {
    const user = userEvent.setup();
    const loggedInUser: User = {
      id: "signed-in-user",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    let authChangeCb:
      ((event: string, session: Session | null) => void) | null = null;

    const { client, mockAuth } = createMockSupabase({
      onAuthStateChange: vi.fn().mockImplementation((cb) => {
        authChangeCb = cb;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }),
      signInWithPassword: vi.fn().mockImplementation(async () => {
        const session: Session = {
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: loggedInUser,
        };
        if (authChangeCb) {
          authChangeCb("SIGNED_IN", session);
        }
        return {
          data: {
            user: loggedInUser,
            session,
          },
          error: null,
        };
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

    await user.click(screen.getByTestId("signin-btn"));

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Password123!",
    });
    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe(
        "test@example.com",
      );
    });
  });

  it("TC-P4-AUTH-006 — signOut terminates session and clears user (FR-033)", async () => {
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

  it("TC-P4-AUTH-007 — resetPassword builds redirectTo from origin (FR-034)", async () => {
    const user = userEvent.setup();
    const { client, mockAuth } = createMockSupabase();

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });

    await user.click(screen.getByTestId("reset-btn"));

    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      "reset@example.com",
      {
        redirectTo: `${window.location.origin}/account/reset-password`,
      },
    );
  });

  it("TC-P4-AUTH-008 — updatePassword calls updateUser with new password", async () => {
    const user = userEvent.setup();
    const { client, mockAuth } = createMockSupabase();

    render(
      <AuthProvider client={client}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });

    await user.click(screen.getByTestId("update-pw-btn"));

    expect(mockAuth.updateUser).toHaveBeenCalledWith({
      password: "NewPassword123!",
    });
  });

  it("TC-P4-AUTH-009 — handles auth state change listener events", async () => {
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
        access_token: "t",
        refresh_token: "r",
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
