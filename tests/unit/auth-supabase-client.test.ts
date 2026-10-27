import { vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("auth Supabase client", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalPublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }

    if (originalPublishableKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
    }
  });

  it("fails safely when auth public configuration is absent", async () => {
    const { getAuthSupabaseClient, AuthSupabaseConfigurationError } =
      await import("@/lib/supabase/auth-client");

    expect(() => getAuthSupabaseClient()).toThrow(
      AuthSupabaseConfigurationError,
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("initializes with session persistence, URL detection, and auto-refresh enabled", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public-project.example";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-test-key";
    const clientFixture = { auth: {} };
    createClientMock.mockReturnValue(clientFixture);

    const { getAuthSupabaseClient } =
      await import("@/lib/supabase/auth-client");

    expect(getAuthSupabaseClient()).toBe(clientFixture);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://public-project.example",
      "public-test-key",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  });
});
