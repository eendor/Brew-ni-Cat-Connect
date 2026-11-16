"use client";

import { useState } from "react";

import { initialsOf, safeGooglePhotoUrl } from "@/lib/account/avatar";

export type AvatarProps = Readonly<{
  name: string | null | undefined;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}>;

/**
 * A round profile photo with an initials fallback (FR-119). The photo is
 * decorative because the name is always shown next to it.
 */
export function Avatar({ name, photoUrl, size = 36, className }: AvatarProps) {
  const safeUrl = safeGooglePhotoUrl(photoUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = safeUrl !== null && failedUrl !== safeUrl;

  return (
    <span
      aria-hidden="true"
      data-testid="avatar"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent-solid)] ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {showPhoto ? (
        // A plain img: Google photos are already small and sized by URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailedUrl(safeUrl)}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
