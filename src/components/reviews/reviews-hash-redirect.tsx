"use client";

import { useEffect } from "react";

/**
 * Old links to `/about#reviews` (shared before the reviews got their own
 * page on 2026-11-13) open `/reviews` instead, whether the page loads with
 * the hash or only the hash changes while About is open.
 */
export function ReviewsHashRedirect() {
  useEffect(() => {
    const forward = () => {
      if (window.location.hash === "#reviews")
        window.location.replace("/reviews");
    };
    forward();
    window.addEventListener("hashchange", forward);
    return () => window.removeEventListener("hashchange", forward);
  }, []);
  return null;
}
