import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads public data (site content, the menu) while a page renders on the
 * server. It uses the same publishable key as the browser, so it can only
 * read what everyone may read (FR-037). Next.js keeps each successful answer
 * for a minute: an owner's change shows within about a minute, with no
 * redeploy (FR-085), and visitors don't each cost a database read.
 */
export const SERVER_READ_REVALIDATE_SECONDS = 60;

/** A slow database must not hold a page: the fallback copy shows instead. */
const READ_TIMEOUT_MS = 4000;

function cachedFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(READ_TIMEOUT_MS),
    next: { revalidate: SERVER_READ_REVALIDATE_SECONDS },
  });
}

let client: SupabaseClient | null | undefined;

/** null when the public Supabase settings are missing. */
export function getServerReadClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client =
    url && publishableKey
      ? createClient(url, publishableKey, {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
          },
          global: { fetch: cachedFetch },
        })
      : null;
  return client;
}
