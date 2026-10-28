/**
 * Shared by the route curtain, the motion director and the 3D layer.
 *
 * - While the curtain covers a client-side navigation, the new page's
 *   entrances wait for it to start opening, so they play in view instead of
 *   behind it (`whenCurtainOpens`).
 * - From the moment the curtain starts closing until it has fully opened, it
 *   is moving: 3D scenes skip their frames, and the new page's scenes wait
 *   to start (`whenCurtainSettles`), so the transition doesn't stutter.
 */
const opening = new Set<() => void>();
const settling = new Set<() => void>();
let covering = false;
let moving = false;

function release(waiting: Set<() => void>) {
  const ready = [...waiting];
  waiting.clear();
  ready.forEach((callback) => callback());
}

export function curtainCovering() {
  return covering;
}

/** True from the moment the curtain starts closing until it has fully opened. */
export function curtainMoving() {
  return moving;
}

/** `true` when the curtain starts closing, `false` when it starts opening. */
export function setCurtainCovering(next: boolean) {
  covering = next;
  if (next) {
    moving = true;
    return;
  }
  release(opening);
}

/** The curtain has fully opened, or was taken down part-way. */
export function setCurtainSettled() {
  if (covering) setCurtainCovering(false);
  moving = false;
  release(settling);
}

/** Runs `callback` now, or as soon as the curtain starts to open. */
export function whenCurtainOpens(callback: () => void) {
  if (!covering) {
    callback();
    return () => {};
  }
  opening.add(callback);
  return () => {
    opening.delete(callback);
  };
}

/** Runs `callback` now, or once the curtain has fully opened. */
export function whenCurtainSettles(callback: () => void) {
  if (!moving) {
    callback();
    return () => {};
  }
  settling.add(callback);
  return () => {
    settling.delete(callback);
  };
}
