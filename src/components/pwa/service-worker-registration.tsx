"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (FR-068) after the page has loaded. It only
 * runs in a production build, so development keeps its fast refresh and never
 * serves a stale shell.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    function register() {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // The site works without a service worker; keep the failure quiet.
      });
    }

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
