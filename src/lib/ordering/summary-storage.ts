/**
 * Keeps the generated order summary for this browser tab, so a refresh on
 * the final checkout step shows the same summary instead of an empty form.
 *
 * The summary holds the customer's name and phone number, so it lives in
 * sessionStorage (gone when the tab closes) rather than localStorage, and a
 * stored summary older than 12 hours or not shaped like a summary is
 * ignored. When storage is blocked or full, the summary is kept in memory
 * for the rest of the visit.
 */
const KEY = "brew-ni-cat:prepared-summary";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

type StoredSummary = Readonly<{ savedAt: number; summary: unknown }>;

const listeners = new Set<() => void>();
/** Set once saving to sessionStorage has failed in this visit. */
let memoryOnly = false;
let memoryRaw: string | null = null;
let lastRaw: string | null = null;
let lastValue: unknown = null;

function readRaw(): string | null {
  if (memoryOnly) return memoryRaw;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function parse<T>(
  raw: string | null,
  isSummary: (value: unknown) => value is T,
): T | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Partial<StoredSummary> | null;
    if (
      typeof stored?.savedAt !== "number" ||
      Date.now() - stored.savedAt > MAX_AGE_MS
    ) {
      return null;
    }
    return isSummary(stored.summary) ? stored.summary : null;
  } catch {
    return null;
  }
}

export function subscribeStoredSummary(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Stable snapshot for useSyncExternalStore: the same object until the
 * stored summary changes. `isSummary` checks the shape, so an old or
 * hand-edited entry can't break the page.
 */
export function getStoredSummary<T>(
  isSummary: (value: unknown) => value is T,
): T | null {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastValue = parse(raw, isSummary);
  }
  return lastValue as T | null;
}

export function saveStoredSummary(summary: unknown) {
  const raw = JSON.stringify({ savedAt: Date.now(), summary });
  memoryRaw = raw;
  if (!memoryOnly) {
    try {
      window.sessionStorage.setItem(KEY, raw);
    } catch {
      // blocked or full: keep showing the summary from memory
      memoryOnly = true;
    }
  }
  notify();
}

export function clearStoredSummary() {
  memoryRaw = null;
  memoryOnly = false;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
  notify();
}
