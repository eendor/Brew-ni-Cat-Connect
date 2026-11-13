"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/context/auth-context";

/**
 * Account routes accessible without being signed in.
 * All other /account/* pages require authentication and redirect unauthenticated
 * visitors to /account/sign-in with a `returnTo` parameter (FR-036).
 */
export const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/sign-in",
  "/account/sign-up",
  "/account/callback",
]);

export function AccountGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const normalizedPath = pathname?.replace(/\/$/, "") || "";
  const isPublicAccountRoute = PUBLIC_ACCOUNT_PATHS.has(normalizedPath);

  useEffect(() => {
    if (!isLoading && !user && !isPublicAccountRoute && pathname) {
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const returnUrl = search ? `${pathname}${search}` : pathname;
      router.replace(
        `/account/sign-in?returnTo=${encodeURIComponent(returnUrl)}`,
      );
    }
  }, [isLoading, user, isPublicAccountRoute, pathname, router]);

  if (isPublicAccountRoute) {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    return (
      <div
        className="py-16 text-center"
        role="status"
        aria-label="Checking account credentials"
      >
        <div className="mx-auto max-w-md space-y-4 animate-pulse">
          <div className="h-8 rounded-[var(--shape-md)] bg-[var(--fill-secondary)] mx-auto w-48" />
          <div className="h-4 rounded-[var(--shape-sm)] bg-[var(--fill-secondary)] mx-auto w-64" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
