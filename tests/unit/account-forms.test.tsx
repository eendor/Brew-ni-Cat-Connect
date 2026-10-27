import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SignUpView } from "@/components/account/sign-up-view";
import { SignInView } from "@/components/account/sign-in-view";
import { ForgotPasswordView } from "@/components/account/forgot-password-view";
import { ResetPasswordView } from "@/components/account/reset-password-view";
import { AuthProvider } from "@/context/auth-context";

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

describe("Account Forms Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockSupabase(overrides?: Partial<SupabaseClient["auth"]>) {
    return {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: null,
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
      },
    } as unknown as SupabaseClient;
  }

  describe("SignUpView (FR-031, FR-035)", () => {
    it("TC-P4-161 — shows validation errors on empty or invalid inputs", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase();

      render(
        <AuthProvider client={client}>
          <SignUpView />
        </AuthProvider>,
      );

      await user.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText("Email is required.")).toBeInTheDocument();
      expect(screen.getByText("Password is required.")).toBeInTheDocument();
    });

    it("TC-P4-162 — shows clear error for a weak password (less than 6 characters)", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase();

      render(
        <AuthProvider client={client}>
          <SignUpView />
        </AuthProvider>,
      );

      await user.type(
        screen.getByLabelText(/email address/i),
        "test@example.com",
      );
      await user.type(screen.getByLabelText(/^password/i), "123");
      await user.type(screen.getByLabelText(/confirm password/i), "123");

      await user.click(screen.getByRole("button", { name: /create account/i }));

      expect(
        screen.getByText("Password must be at least 6 characters long."),
      ).toBeInTheDocument();
      expect(client.auth.signUp).not.toHaveBeenCalled();
    });

    it("TC-P4-163 — shows clear error when passwords do not match", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase();

      render(
        <AuthProvider client={client}>
          <SignUpView />
        </AuthProvider>,
      );

      await user.type(
        screen.getByLabelText(/email address/i),
        "test@example.com",
      );
      await user.type(screen.getByLabelText(/^password/i), "Password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "Different123",
      );

      await user.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
      expect(client.auth.signUp).not.toHaveBeenCalled();
    });

    it("TC-P4-164 — does not reveal whether email is already registered and shows confirmation notice (FR-031, FR-032)", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase({
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: {
            code: "user_already_exists",
            message: "User already registered",
            status: 422,
          },
        }),
      });

      render(
        <AuthProvider client={client}>
          <SignUpView />
        </AuthProvider>,
      );

      await user.type(
        screen.getByLabelText(/email address/i),
        "existing@example.com",
      );
      await user.type(screen.getByLabelText(/^password/i), "Password123!");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "Password123!",
      );

      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /confirm your email/i }),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/this email is already in use/i),
      ).not.toBeInTheDocument();
    });

    it("TC-P4-165 — asks customer to confirm their email on successful sign-up (FR-035)", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase({
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "new-user", email: "newuser@example.com" },
            session: null,
          },
          error: null,
        }),
      });

      render(
        <AuthProvider client={client}>
          <SignUpView />
        </AuthProvider>,
      );

      await user.type(
        screen.getByLabelText(/email address/i),
        "newuser@example.com",
      );
      await user.type(screen.getByLabelText(/^password/i), "Password123!");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "Password123!",
      );

      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /confirm your email/i }),
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/newuser@example\.com/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /proceed to sign in/i }),
      ).toHaveAttribute("href", "/account/sign-in");
    });
  });

  describe("SignInView (FR-032)", () => {
    it("TC-P4-166 — shows validation errors on empty submit", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase();

      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      await user.click(screen.getByRole("button", { name: /^sign in$/i }));

      expect(screen.getByText("Email is required.")).toBeInTheDocument();
      expect(screen.getByText("Password is required.")).toBeInTheDocument();
    });

    it("TC-P4-167 — distinguishes unconfirmed account from invalid credentials (FR-032)", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase({
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: {
            code: "email_not_confirmed",
            message: "Email not confirmed",
            status: 400,
          },
        }),
      });

      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      await user.type(
        screen.getByLabelText(/email address/i),
        "customer@example.com",
      );
      await user.type(screen.getByLabelText(/^password/i), "CorrectPass123");

      await user.click(screen.getByRole("button", { name: /^sign in$/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            /please verify your email address before signing in\. check your inbox for the confirmation link\./i,
          ),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/incorrect email or password/i),
      ).not.toBeInTheDocument();
    });

    it("TC-P4-168 — redirects to / on successful sign-in or shows signed-in notice", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase({
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "c-1", email: "customer@example.com" },
            session: { access_token: "tok" },
          },
          error: null,
        }),
      });

      render(
        <AuthProvider client={client}>
          <SignInView />
        </AuthProvider>,
      );

      await user.type(
        screen.getByLabelText(/email address/i),
        "customer@example.com",
      );
      await user.type(screen.getByLabelText(/^password/i), "CorrectPass123");

      await user.click(screen.getByRole("button", { name: /^sign in$/i }));

      await waitFor(() => {
        expect(routerPush).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("ForgotPasswordView (FR-034)", () => {
    it("TC-P4-169 — sends password reset link and shows confirmation notice", async () => {
      const user = userEvent.setup();
      const client = createMockSupabase();

      render(
        <AuthProvider client={client}>
          <ForgotPasswordView />
        </AuthProvider>,
      );

      await user.type(
        screen.getByLabelText(/email address/i),
        "recovery@example.com",
      );
      await user.click(
        screen.getByRole("button", { name: /send reset link/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /check your email/i }),
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/recovery@example\.com/i)).toBeInTheDocument();
      expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "recovery@example.com",
        {
          redirectTo: `${window.location.origin}/account/reset-password`,
        },
      );
    });
  });

  describe("ResetPasswordView (FR-034)", () => {
    it("TC-P4-170 — protects reset password view when PASSWORD_RECOVERY event is absent (FR-034)", async () => {
      const client = createMockSupabase();

      render(
        <AuthProvider client={client}>
          <ResetPasswordView />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /invalid or expired link/i }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText("This link is invalid or has expired."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /forgot password/i }),
      ).toHaveAttribute("href", "/account/forgot-password");
      expect(screen.queryByLabelText(/^new password/i)).not.toBeInTheDocument();
    });

    it("TC-P4-171 — updates password when PASSWORD_RECOVERY event is present (FR-034)", async () => {
      const user = userEvent.setup();
      let authChangeCb: ((event: string, session: unknown) => void) | null =
        null;
      const client = createMockSupabase({
        onAuthStateChange: vi.fn().mockImplementation((cb) => {
          authChangeCb = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        updateUser: vi.fn().mockResolvedValue({
          data: { user: { id: "u-1" } },
          error: null,
        }),
      });

      render(
        <AuthProvider client={client}>
          <ResetPasswordView />
        </AuthProvider>,
      );

      // Trigger PASSWORD_RECOVERY event from onAuthStateChange
      act(() => {
        if (authChangeCb) {
          authChangeCb("PASSWORD_RECOVERY", {
            access_token: "tok",
            user: { id: "u-1", email: "user@example.com" },
          });
        }
      });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /set new password/i }),
        ).toBeInTheDocument();
      });

      await user.type(
        screen.getByLabelText(/^new password/i),
        "BrandNewPassword123!",
      );
      await user.type(
        screen.getByLabelText(/confirm new password/i),
        "BrandNewPassword123!",
      );

      await user.click(
        screen.getByRole("button", { name: /update password/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /password updated/i }),
        ).toBeInTheDocument();
      });
      expect(client.auth.updateUser).toHaveBeenCalledWith({
        password: "BrandNewPassword123!",
      });
      expect(
        screen.getByRole("link", { name: /continue to sign in/i }),
      ).toHaveAttribute("href", "/account/sign-in");
    });
  });
});
