import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { AuthCallbackView } from "@/components/account/auth-callback-view";
import { SignInView } from "@/components/account/sign-in-view";
import { SignUpView } from "@/components/account/sign-up-view";
import { AuthProvider } from "@/context/auth-context";

const routerReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: routerReplace }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/account/sign-in",
}));

const customer: User = {
  id: "user-g",
  email: "maria@example.com",
  app_metadata: { provider: "google" },
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

function sessionFor(user: User): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };
}

function createMockSupabase(overrides?: Partial<SupabaseClient["auth"]>) {
  const auth = {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { provider: "google", url: "https://accounts.example/auth" },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  return { client: { auth } as unknown as SupabaseClient, auth };
}

function setAddress(path: string) {
  window.history.replaceState(null, "", path);
}

describe("Google sign-in and sign-up (ADR-030)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    setAddress("/");
  });

  describe("SignInView", () => {
    it("TC-P5-216 — shows only the Google button: no email or password fields, no Forgot password link", async () => {
      const { client } = createMockSupabase();
      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      expect(
        await screen.findByRole("button", { name: "Sign in with Google" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Sign In" })).toBeVisible();
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Create an account" }),
      ).toHaveAttribute("href", "/account/sign-up");
    });

    it("TC-P5-217 — the button starts Google sign-in and keeps the checked returnTo", async () => {
      setAddress("/account/sign-in?returnTo=%2Faccount%2Forders");
      const user = userEvent.setup();
      const { client, auth } = createMockSupabase();
      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      await user.click(
        await screen.findByRole("button", { name: "Sign in with Google" }),
      );

      expect(auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/account/callback?returnTo=%2Faccount%2Forders`,
          queryParams: { prompt: "select_account" },
        },
      });
      expect(
        screen.getByRole("button", { name: "Opening Google…" }),
      ).toBeDisabled();
    });

    it("TC-P5-218 — an outside returnTo is dropped before Google sign-in starts", async () => {
      setAddress("/account/sign-in?returnTo=https%3A%2F%2Fevil.example");
      const user = userEvent.setup();
      const { client, auth } = createMockSupabase();
      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      await user.click(
        await screen.findByRole("button", { name: "Sign in with Google" }),
      );

      expect(auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: `${window.location.origin}/account/callback`,
          }),
        }),
      );
    });

    it("TC-P5-219 — shows an alert and frees the button when Google sign-in can't start", async () => {
      const user = userEvent.setup();
      const { client } = createMockSupabase({
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { provider: "google", url: null },
          error: new Error("provider is not enabled"),
        }),
      });
      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      await user.click(
        await screen.findByRole("button", { name: "Sign in with Google" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn't open Google sign-in. Please try again.",
      );
      expect(
        screen.getByRole("button", { name: "Sign in with Google" }),
      ).toBeEnabled();
    });

    it("TC-P4-168 — a signed-in customer sees the already-signed-in notice instead of the button", async () => {
      const { client } = createMockSupabase({
        getSession: vi.fn().mockResolvedValue({
          data: { session: sessionFor(customer) },
          error: null,
        }),
      });
      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      expect(
        await screen.findByRole("heading", {
          name: "You're already signed in",
        }),
      ).toBeVisible();
      expect(screen.getByText("maria@example.com")).toBeVisible();
      expect(
        screen.queryByRole("button", { name: /google/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("SignUpView", () => {
    it("TC-P5-220 — creating an account is the same Google button, with no password fields", async () => {
      const user = userEvent.setup();
      const { client, auth } = createMockSupabase();
      render(
        <AuthProvider client={client}>
          <SignUpView />
        </AuthProvider>,
      );

      expect(
        screen.getByRole("heading", { name: "Create an Account" }),
      ).toBeVisible();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/account/sign-in",
      );

      await user.click(
        await screen.findByRole("button", { name: "Sign up with Google" }),
      );
      expect(auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" }),
      );
    });

    it("TC-P5-092 — tells the customer what Google shares and links the Privacy Policy before the account is made (NFR-026)", () => {
      const { client } = createMockSupabase();
      render(
        <AuthProvider client={client}>
          <SignUpView />
        </AuthProvider>,
      );

      expect(
        screen.getByText(/We get your name and email from Google/),
      ).toBeVisible();
      expect(
        screen.getByRole("link", { name: "Privacy Policy" }),
      ).toHaveAttribute("href", "/privacy");
    });
  });

  describe("AuthCallbackView", () => {
    it("TC-P5-221 — goes on to the checked returnTo once the session is in", async () => {
      setAddress("/account/callback?returnTo=%2Faccount%2Frewards");
      const { client } = createMockSupabase({
        getSession: vi.fn().mockResolvedValue({
          data: { session: sessionFor(customer) },
          error: null,
        }),
      });
      render(
        <AuthProvider client={client}>
          <AuthCallbackView />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(routerReplace).toHaveBeenCalledWith("/account/rewards");
      });
    });

    it("TC-P5-222 — never follows an outside returnTo from the callback address", async () => {
      setAddress("/account/callback?returnTo=%2F%2Fevil.example");
      const { client } = createMockSupabase({
        getSession: vi.fn().mockResolvedValue({
          data: { session: sessionFor(customer) },
          error: null,
        }),
      });
      render(
        <AuthProvider client={client}>
          <AuthCallbackView />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(routerReplace).toHaveBeenCalledWith("/");
      });
    });

    it("TC-P5-223 — says sign-in was cancelled when Google returns access_denied", async () => {
      setAddress(
        "/account/callback?error=access_denied&error_description=denied",
      );
      const { client } = createMockSupabase();
      render(
        <AuthProvider client={client}>
          <AuthCallbackView />
        </AuthProvider>,
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Google sign-in was cancelled.",
      );
      expect(
        screen.getByRole("link", { name: "Back to Sign In" }),
      ).toHaveAttribute("href", "/account/sign-in");
      expect(routerReplace).not.toHaveBeenCalled();
    });

    it("TC-P5-224 — says sign-in didn't finish when no session comes back", async () => {
      setAddress("/account/callback?code=expired");
      const { client } = createMockSupabase();
      render(
        <AuthProvider client={client}>
          <AuthCallbackView />
        </AuthProvider>,
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn't finish signing you in with Google.",
      );
      expect(routerReplace).not.toHaveBeenCalled();
    });
  });
});
