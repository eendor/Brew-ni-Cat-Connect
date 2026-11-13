/**
 * Ads in the mini-game area only (FR-090).
 *
 * The ad unit is an Adsterra 300x250 banner. Ads are off unless
 * NEXT_PUBLIC_AD_KEY is set, they load only after the customer agrees, and
 * they never show on the menu, cart, checkout, order or account pages.
 */
export const AD_WIDTH = 300;
export const AD_HEIGHT = 250;
export const AD_SCRIPT_HOST = "https://bauval.org/22/";
export const AD_CONSENT_KEY = "bnc-ad-consent";
/** The message the ad frame posts to this page once an ad has appeared. */
export const AD_FILLED_MESSAGE = "bnc-ad-filled";
/** How long to wait for an ad before showing a note instead of a blank box. */
export const AD_FILL_TIMEOUT_MS = 8000;

/**
 * Runs inside the ad frame. It watches for an ad of real size and tells the
 * parent page once, with no data beyond the message name.
 */
const FILL_REPORTER = `(function(){var sent=false;function check(){if(sent)return;var els=document.querySelectorAll("iframe,img,ins,a,canvas,video,div");for(var i=0;i<els.length;i++){var r=els[i].getBoundingClientRect();if(r.width>=100&&r.height>=50){sent=true;parent.postMessage("${AD_FILLED_MESSAGE}","*");return}}}new MutationObserver(check).observe(document.documentElement,{childList:true,subtree:true,attributes:true});setInterval(check,1000)})();`;

/** Pages where an ad must never appear, even if a slot is placed there. */
export const AD_FREE_PREFIXES = [
  "/menu",
  "/cart",
  "/checkout",
  "/order",
  "/orders",
  "/account",
] as const;

export type AdConsent = "yes" | "no" | null;

const KEY_PATTERN = /^[a-f0-9]{32}$/;

/** The public ad unit key, or null when ads are off or the key looks wrong. */
export function adKey(value = process.env.NEXT_PUBLIC_AD_KEY): string | null {
  const key = value?.trim().toLowerCase() ?? "";
  return KEY_PATTERN.test(key) ? key : null;
}

export function isAdFreePath(pathname: string): boolean {
  return AD_FREE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// keeps the choice for this visit when storage is blocked
let memoryConsent: AdConsent = null;
const listeners = new Set<() => void>();

export function readAdConsent(): AdConsent {
  try {
    const value = window.localStorage.getItem(AD_CONSENT_KEY);
    if (value === "yes" || value === "no") return value;
  } catch {
    // fall back to this visit's choice
  }
  return memoryConsent;
}

export function saveAdConsent(value: "yes" | "no"): void {
  memoryConsent = value;
  try {
    window.localStorage.setItem(AD_CONSENT_KEY, value);
  } catch {
    // private windows can block storage; the choice then lasts for this visit
  }
  listeners.forEach((listener) => listener());
}

export function subscribeAdConsent(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Test helper: forget this visit's choice. */
export function resetAdConsentForTests(): void {
  memoryConsent = null;
}

/** The page loaded inside the sandboxed ad frame. */
export function adDocument(key: string): string {
  const options = JSON.stringify({
    key,
    format: "iframe",
    height: AD_HEIGHT,
    width: AD_WIDTH,
    params: {},
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>${FILL_REPORTER}</script><script>atOptions = ${options};</script><script src="${AD_SCRIPT_HOST}${key}"></script></body></html>`;
}
