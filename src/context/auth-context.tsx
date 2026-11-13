"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthError,
  Session,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";

export type AuthContextValue = Readonly<{
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  /**
   * Sends the browser to Google's sign-in (ADR-030). The same call signs in an
   * existing customer and creates the account for a new one. On success the
   * page navigates away, so only a failure to start is returned.
   */
  signInWithGoogle: (
    returnTo?: string,
  ) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<{ error: AuthError | Error | null }>;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

const unavailable = () => new Error("Authentication service is unavailable");

const fallbackAuthValue: AuthContextValue = {
  user: null,
  session: null,
  isLoading: false,
  signInWithGoogle: async () => ({ error: unavailable() }),
  signOut: async () => ({ error: null }),
};

/** The address Google returns to; `returnTo` is checked again there. */
export function oauthCallbackUrl(origin: string, returnTo?: string): string {
  const url = new URL("/account/callback", origin);
  if (returnTo && returnTo !== "/") {
    url.searchParams.set("returnTo", returnTo);
  }
  return url.toString();
}

export type AuthProviderProps = Readonly<{
  children: ReactNode;
  client?: SupabaseClient;
}>;

export function AuthProvider({
  children,
  client: clientProp,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getClient = useCallback((): SupabaseClient | null => {
    if (clientProp) {
      return clientProp;
    }
    try {
      return getAuthSupabaseClient();
    } catch {
      return null;
    }
  }, [clientProp]);

  // Restore session on reload and watch auth state changes
  useEffect(() => {
    const client = getClient();
    if (!client) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    let isMounted = true;

    // Initial session read on reload
    client.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error || !session) {
          setUser(null);
          setSession(null);
        } else {
          const isExpired =
            session.expires_at !== undefined &&
            session.expires_at * 1000 <= Date.now();
          if (isExpired) {
            setUser(null);
            setSession(null);
          } else {
            setUser(session.user);
            setSession(session);
          }
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setSession(null);
        setIsLoading(false);
      });

    // Listen to changes in auth state
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
      } else if (!session) {
        setUser(null);
        setSession(null);
      } else if (
        session.expires_at !== undefined &&
        session.expires_at * 1000 <= Date.now()
      ) {
        setUser(null);
        setSession(null);
      } else {
        setUser(session.user);
        setSession(session);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [getClient]);

  const signInWithGoogle = useCallback(
    async (returnTo?: string) => {
      const client = getClient();
      if (!client) {
        return { error: unavailable() };
      }
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: origin ? oauthCallbackUrl(origin, returnTo) : undefined,
          queryParams: { prompt: "select_account" },
        },
      });
      return { error: error ?? null };
    },
    [getClient],
  );

  const signOut = useCallback(async () => {
    const client = getClient();
    if (!client) {
      setUser(null);
      setSession(null);
      return { error: null };
    }
    const res = await client.auth.signOut();
    setUser(null);
    setSession(null);
    return res;
  }, [getClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      signInWithGoogle,
      signOut,
    }),
    [user, session, isLoading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context ?? fallbackAuthValue;
}
