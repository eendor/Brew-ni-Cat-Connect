import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | null = null;

export class PublicSupabaseConfigurationError extends Error {
  constructor() {
    super("The public menu service is not configured.");
    this.name = "PublicSupabaseConfigurationError";
  }
}

export function getPublicSupabaseClient(): SupabaseClient {
  if (publicClient !== null) {
    return publicClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new PublicSupabaseConfigurationError();
  }

  publicClient = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return publicClient;
}
