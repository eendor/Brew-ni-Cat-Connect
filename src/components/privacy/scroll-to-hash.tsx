"use client";

import { useEffect } from "react";

/**
 * Scrolls to the section named in the URL's hash once the page has loaded.
 * The browser's own jump can happen before the layout settles, so a link such
 * as /privacy#delete-your-data could stop short of its section.
 */
export function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);
  return null;
}
