/**
 * Keeps the generated order summary in localStorage so a refresh on the
 * final checkout step shows the same summary instead of an empty cart. It
 * is cleared when the visitor starts a new order.
 */
const KEY = "brew-ni-cat:prepared-summary";
const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let lastValue: unknown = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function subscribeStoredSummary(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Stable snapshot for useSyncExternalStore (same object until it changes). */
export function getStoredSummary<T>(): T | null {
  const raw = read();
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastValue = raw ? JSON.parse(raw) : null;
    } catch {
      lastValue = null;
    }
  }
  return lastValue as T | null;
}

export function saveStoredSummary(summary: unknown) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(summary));
  } catch {
    // storage full or blocked: the summary still shows for this visit
  }
  listeners.forEach((listener) => listener());
}

export function clearStoredSummary() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}
