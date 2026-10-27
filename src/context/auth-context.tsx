"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type {
  AuthError,
  AuthResponse,
  Session,
  SupabaseClient,
  User,
  UserResponse,
} from "@supabase/supabase-js";

import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";

export type AuthContextValue = Readonly<{
  user: User | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    data: { user: User | null; session: Session | null } | null;
    error: AuthError | Error | null;
  }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    data: { user: User | null; session: Session | null } | null;
    error: AuthError | Error | null;
  }>;
  signOut: () => Promise<{ error: AuthError | Error | null }>;
  resetPassword: (email: string) => Promise<{
    data: Record<string, unknown> | null;
    error: AuthError | Error | null;
  }>;
  updatePassword: (password: string) => Promise<{
    data: { user: User | null } | null;
    error: AuthError | Error | null;
  }>;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

const fallbackAuthValue: AuthContextValue = {
  user: null,
  isLoading: false,
  signUp: async () => ({
    data: null,
    error: new Error("Authentication service is unavailable"),
  }),
  signIn: async () => ({
    data: null,
    error: new Error("Authentication service is unavailable"),
  }),
  signOut: async () => ({ error: null }),
  resetPassword: async () => ({
    data: null,
    error: new Error("Authentication service is unavailable"),
  }),
  updatePassword: async () => ({
    data: null,
    error: new Error("Authentication service is unavailable"),
  }),
};

export type AuthProviderProps = Readonly<{
  children: ReactNode;
  client?: SupabaseClient;
}>;

function useRouterSafe() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
  client: clientProp,
}: AuthProviderProps) {
  const router = useRouterSafe();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const [user, setUser] = useState<User | null>(null);
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

    const handleExpired = () => {
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/account/sign-in"
      ) {
        routerRef.current?.push("/account/sign-in");
      }
    };

    // Initial session read on reload
    client.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error || !session) {
          setUser(null);
        } else {
          const isExpired =
            session.expires_at !== undefined &&
            session.expires_at * 1000 <= Date.now();
          if (isExpired) {
            setUser(null);
            handleExpired();
          } else {
            setUser(session.user);
          }
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setIsLoading(false);
      });

    // Listen to changes in auth state
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
      } else if (
        session.expires_at !== undefined &&
        session.expires_at * 1000 <= Date.now()
      ) {
        setUser(null);
        handleExpired();
      } else {
        setUser(session.user);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [getClient]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      const client = getClient();
      if (!client) {
        return {
          data: null,
          error: new Error("Authentication service is unavailable"),
        };
      }
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = origin ? `${origin}/account/sign-in` : undefined;

      const res = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        },
      });
      return res as AuthResponse;
    },
    [getClient],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = getClient();
      if (!client) {
        return {
          data: null,
          error: new Error("Authentication service is unavailable"),
        };
      }
      const res = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (res.data?.user) {
        setUser(res.data.user);
      }
      return res as AuthResponse;
    },
    [getClient],
  );

  const signOut = useCallback(async () => {
    const client = getClient();
    if (!client) {
      setUser(null);
      return { error: null };
    }
    const res = await client.auth.signOut();
    setUser(null);
    return res;
  }, [getClient]);

  const resetPassword = useCallback(
    async (email: string) => {
      const client = getClient();
      if (!client) {
        return {
          data: null,
          error: new Error("Authentication service is unavailable"),
        };
      }
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = origin
        ? `${origin}/account/reset-password`
        : undefined;

      const res = await client.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return res;
    },
    [getClient],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const client = getClient();
      if (!client) {
        return {
          data: null,
          error: new Error("Authentication service is unavailable"),
        };
      }
      const res = await client.auth.updateUser({
        password,
      });
      return res as UserResponse;
    },
    [getClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, isLoading, signUp, signIn, signOut, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context ?? fallbackAuthValue;
}
