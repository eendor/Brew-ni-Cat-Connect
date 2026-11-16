/**
 * Google profile photos (FR-119).
 *
 * Google sign-in gives Supabase Auth the address of the customer's profile
 * photo. Only addresses on Google's photo server are used, so a changed or
 * odd value in the user metadata can never point the page at another site.
 */

const GOOGLE_PHOTO =
  /^https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9/_=.-]+$/;

export function safeGooglePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return url.length <= 600 && GOOGLE_PHOTO.test(url) ? url : null;
}

/** The photo address from a Supabase user's metadata, or null. */
export function googlePhotoFromMetadata(
  metadata: Readonly<Record<string, unknown>> | null | undefined,
): string | null {
  return (
    safeGooglePhotoUrl(metadata?.avatar_url) ??
    safeGooglePhotoUrl(metadata?.picture)
  );
}

/** One or two capital letters for when there is no photo. */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");
  return letters.toLocaleUpperCase() || "?";
}

/** The name Google gave the account, or its email. */
export function accountDisplayName(
  user: Readonly<{
    email?: string | null;
    user_metadata?: Readonly<Record<string, unknown>> | null;
  }>,
): string {
  const meta = user.user_metadata ?? {};
  for (const key of ["full_name", "name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return user.email ?? "";
}
