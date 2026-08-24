import { vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("public Supabase client", () => {
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

  it("TC-P2-019 — fails safely when public configuration is absent", async () => {
    const { getPublicSupabaseClient, PublicSupabaseConfigurationError } =
      await import("@/lib/supabase/public-client");

    expect(() => getPublicSupabaseClient()).toThrow(
      PublicSupabaseConfigurationError,
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("TC-P2-020 — initializes with the publishable public configuration only", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public-project.example";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-test-key";
    const clientFixture = { from: vi.fn() };
    createClientMock.mockReturnValue(clientFixture);

    const { getPublicSupabaseClient } =
      await import("@/lib/supabase/public-client");

    expect(getPublicSupabaseClient()).toBe(clientFixture);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://public-project.example",
      "public-test-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });
});
