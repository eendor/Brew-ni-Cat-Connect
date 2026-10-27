import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let authClient: SupabaseClient | null = null;

export class AuthSupabaseConfigurationError extends Error {
  constructor() {
    super("The authentication service is not configured.");
    this.name = "AuthSupabaseConfigurationError";
  }
}

export function getAuthSupabaseClient(): SupabaseClient {
  if (authClient !== null) {
    return authClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new AuthSupabaseConfigurationError();
  }

  authClient = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return authClient;
}

/** For testing purposes: resets the cached browser client singleton. */
export function resetAuthSupabaseClient(): void {
  authClient = null;
}
