/**
 * Validates a return destination URL to protect against open redirects.
 * Only relative paths under the same origin are permitted; external URLs,
 * protocol-relative URLs (`//evil.example`), backslashes (`/\evil.example`),
 * and whitespace bypasses (`/\t/evil.example`) fall back to `/`.
 */
export function safeReturnTo(raw: string | null): string {
  if (!raw) return "/";
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const url = new URL(raw, origin);
    return url.origin === origin
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}

/** The checked `returnTo` from the current address, or `/`. */
export function returnToFromLocation(): string {
  if (typeof window === "undefined") return "/";
  return safeReturnTo(
    new URLSearchParams(window.location.search).get("returnTo"),
  );
}
