"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { gsap, motionAllowed } from "./gsap";

type PresenceMotion = Readonly<{
  /** Plays as the overlay opens. */
  enter: (root: HTMLElement) => gsap.core.Animation;
  /** Plays as it closes; the overlay unmounts once it finishes. */
  exit: (root: HTMLElement) => gsap.core.Animation;
}>;

/**
 * Keeps an overlay mounted while its exit animation plays, and plays its
 * entrance when it opens. `present` says whether to render it and
 * `leaving` whether it is on its way out (make it inert then). Without
 * motion it mounts and unmounts at once, like a plain conditional render.
 */
export function usePresence(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  motion: PresenceMotion,
) {
  const [present, setPresent] = useState(open);
  const motionRef = useRef(motion);
  useEffect(() => {
    motionRef.current = motion;
  });

  // opening mounts straight away, in the same render
  if (open && !present) setPresent(true);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!open || !present || !root || !motionAllowed()) return;
    const animation = motionRef.current.enter(root);
    return () => {
      animation.kill();
    };
  }, [open, present, ref]);

  useEffect(() => {
    if (open || !present) return;
    const root = ref.current;
    if (!root || !motionAllowed()) {
      setPresent(false);
      return;
    }
    const animation = motionRef.current.exit(root);
    animation.eventCallback("onComplete", () => setPresent(false));
    return () => {
      animation.kill();
    };
  }, [open, present, ref]);

  return { present, leaving: present && !open };
}
