/**
 * Shared by the route curtain, the motion director and the 3D layer.
 *
 * - While the curtain covers a client-side navigation, the new page's
 *   entrances wait for it to start opening, so they play in view instead of
 *   behind it (`whenCurtainOpens`), and 3D scenes skip their frames.
 * - The new page's hero scenes build behind the curtain and hold it closed
 *   until they have drawn their first frame (`holdCurtain`), so the page is
 *   revealed with its 3D already there. The curtain caps that wait.
 * - Scenes further down the page wait until the curtain has fully opened
 *   (`whenCurtainSettles`), so building them doesn't make it stutter.
 * - From the moment the curtain starts closing until it has fully opened,
 *   `<html>` carries `data-curtain`, so a 3D layer that becomes ready in
 *   that time appears at once instead of fading in.
 */
const opening = new Set<() => void>();
const settling = new Set<() => void>();
const unheld = new Set<() => void>();
const holds = new Set<symbol>();
let covering = false;
let moving = false;

function release(waiting: Set<() => void>) {
  const ready = [...waiting];
  waiting.clear();
  ready.forEach((callback) => callback());
}

function markMoving(next: boolean) {
  moving = next;
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute("data-curtain", next);
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
    markMoving(true);
    return;
  }
  release(opening);
}

/** The curtain has fully opened, or was taken down part-way. */
export function setCurtainSettled() {
  if (covering) setCurtainCovering(false);
  markMoving(false);
  release(settling);
}

/**
 * Keeps the curtain closed until the returned function runs: a hero scene
 * building on the page the curtain opens onto.
 */
export function holdCurtain() {
  const hold = Symbol("hold");
  holds.add(hold);
  return () => {
    if (holds.delete(hold) && holds.size === 0) release(unheld);
  };
}

/** Runs `callback` now, or once nothing holds the curtain closed. */
export function whenCurtainUnheld(callback: () => void) {
  if (holds.size === 0) {
    callback();
    return () => {};
  }
  unheld.add(callback);
  return () => {
    unheld.delete(callback);
  };
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
