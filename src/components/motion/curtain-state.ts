/**
 * Shared between the route curtain and the motion director: while the
 * curtain covers a client-side navigation, the new page's entrances wait
 * for it to start opening, so they play in view instead of behind it.
 */
const waiting = new Set<() => void>();
let covering = false;

export function curtainCovering() {
  return covering;
}

export function setCurtainCovering(next: boolean) {
  covering = next;
  if (next) return;
  const ready = [...waiting];
  waiting.clear();
  ready.forEach((callback) => callback());
}

/** Runs `callback` now, or as soon as the curtain starts to open. */
export function whenCurtainOpens(callback: () => void) {
  if (!covering) {
    callback();
    return () => {};
  }
  waiting.add(callback);
  return () => {
    waiting.delete(callback);
  };
}
