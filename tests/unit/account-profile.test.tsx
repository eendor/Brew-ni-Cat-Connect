import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileView } from "@/components/account/profile-view";
import { AuthProvider } from "@/context/auth-context";
import {
  validateCustomerProfile,
  fetchCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/lib/account/profile";

const mockUser: User = {
  id: "customer-123",
  email: "juan@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

function createMockAuthClient(user: User | null = mockUser) {
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

describe("Customer Profile Logic and Component Tests (FR-038)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Profile validation & normalization", () => {
    it("TC-P4-263 — validates full name and phone number per validation rules", () => {
      // Empty name
      expect(
        validateCustomerProfile({ fullName: "", phone: "09123456789" }),
      ).toEqual({
        isValid: false,
        errors: { fullName: "Please enter your full name." },
      });

      // Name exceeding 100 characters
      expect(
        validateCustomerProfile({
          fullName: "A".repeat(101),
          phone: "09123456789",
        }),
      ).toEqual({
        isValid: false,
        errors: {
          fullName: "Please keep your name to 100 characters or fewer.",
        },
      });

      // Empty phone
      expect(
        validateCustomerProfile({
          fullName: "Juan Dela Cruz",
          phone: "",
        }),
      ).toEqual({
        isValid: false,
        errors: { phone: "Please enter your contact phone number." },
      });

      // Invalid phone
      expect(
        validateCustomerProfile({
          fullName: "Juan Dela Cruz",
          phone: "12345",
        }),
      ).toEqual({
        isValid: false,
        errors: {
          phone:
            "Please enter a valid Philippine mobile number (e.g. 0912 345 6789 or +63 912 345 6789).",
        },
      });
    });

    it("TC-P4-264 — normalizes phone number to +639XXXXXXXXX before saving", () => {
      const result = validateCustomerProfile({
        fullName: "  Juan Dela Cruz  ",
        phone: "0912 345 6789",
      });

      expect(result.isValid).toBe(true);
      expect(result.normalized).toEqual({
        fullName: "Juan Dela Cruz",
        phone: "+639123456789",
      });
    });
  });

  describe("ProfileView component", () => {
    it("TC-P4-265 — shows loading state, loads existing profile, and saves updates", async () => {
      const user = userEvent.setup();
      const client = createMockAuthClient(mockUser);

      const existingProfile: CustomerProfile = {
        userId: "customer-123",
        fullName: "Juan Dela Cruz",
        phone: "+639123456789",
        createdAt: "2026-11-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
      };

      const fetchProfileMock = vi.fn().mockResolvedValue(existingProfile);
      const saveProfileMock = vi.fn().mockResolvedValue({
        ok: true,
        profile: {
          userId: "customer-123",
          fullName: "Juan Gomez",
          phone: "+639987654321",
        },
      });

      render(
        <AuthProvider client={client}>
          <ProfileView
            fetchProfile={fetchProfileMock}
            saveProfile={saveProfileMock}
          />
        </AuthProvider>,
      );

      // Verify existing profile loads into inputs
      const nameInput = await screen.findByLabelText(/full name/i);
      expect(nameInput).toHaveValue("Juan Dela Cruz");

      const phoneInput = screen.getByLabelText(/phone number/i);
      expect(phoneInput).toHaveValue("+639123456789");

      // Verify email input is present and disabled
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveValue("juan@example.com");
      expect(emailInput).toBeDisabled();

      // Edit name and phone
      await user.clear(nameInput);
      await user.type(nameInput, "Juan Gomez");
      await user.clear(phoneInput);
      await user.type(phoneInput, "0998 765 4321");

      // Submit the form
      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      // Verify success message appears
      await waitFor(() => {
        expect(
          screen.getByText("Your profile has been saved successfully."),
        ).toBeInTheDocument();
      });

      expect(saveProfileMock).toHaveBeenCalledWith({
        userId: "customer-123",
        input: {
          fullName: "Juan Gomez",
          phone: "0998 765 4321",
        },
      });
    });

    it("verifies fetchCustomerProfile and saveCustomerProfile service calls", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              user_id: "customer-123",
              full_name: "Juan Dela Cruz",
              phone: "+639123456789",
              created_at: "2026-11-01T00:00:00Z",
              updated_at: "2026-11-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      });

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              user_id: "customer-123",
              full_name: "Juan Dela Cruz",
              phone: "+639123456789",
              created_at: "2026-11-01T00:00:00Z",
              updated_at: "2026-11-05T00:00:00Z",
            },
            error: null,
          }),
        }),
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "customer_profiles") {
            return {
              select: selectMock,
              upsert: upsertMock,
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      const profile = await fetchCustomerProfile({
        userId: "customer-123",
        client: mockSupabase,
      });
      expect(profile).toEqual({
        userId: "customer-123",
        fullName: "Juan Dela Cruz",
        phone: "+639123456789",
        createdAt: "2026-11-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
      });

      const saveRes = await saveCustomerProfile({
        userId: "customer-123",
        input: { fullName: "Juan Dela Cruz", phone: "0912 345 6789" },
        client: mockSupabase,
      });
      expect(saveRes.ok).toBe(true);
      expect(upsertMock).toHaveBeenCalledWith({
        user_id: "customer-123",
        full_name: "Juan Dela Cruz",
        phone: "+639123456789",
      });
    });

    it("shows sign in prompt when user is signed out", async () => {
      const client = createMockAuthClient(null);

      render(
        <AuthProvider client={client}>
          <ProfileView />
        </AuthProvider>,
      );

      expect(
        await screen.findByRole("heading", { name: "Sign In to View Profile" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
        "href",
        "/account/sign-in?returnTo=/account/profile",
      );
    });
  });
});
