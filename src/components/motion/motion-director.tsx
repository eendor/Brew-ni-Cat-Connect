"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

import { whenCurtainOpens } from "./curtain-state";
import { EASE, finePointer, gsap, motionAllowed, motionPlugins } from "./gsap";

const SPLIT = "[data-split]";
const RISE = "[data-rise], [data-rise-group] > *";
const UNVEIL = "[data-unveil]";
/** Gap between elements that come into view together. */
const STAGGER = 0.08;

type Player = (delay: number) => void;

/** Longest wait for hydration; the CSS failsafe shows content at 3 s. */
const HYDRATION_WAIT_MS = 2500;

/**
 * React marks each DOM node it has hydrated with an internal fiber key.
 * Inline styles written before that make React report a mismatch, so the
 * director waits until every animated element carries one.
 */
function isHydrated(element: Element) {
  return Object.keys(element).some((key) => key.startsWith("__reactFiber$"));
}

/**
 * Scroll and entrance motion for every page, declared with data attributes
 * so pages stay server components:
 *
 * - `data-split`: a heading's lines rise out of a mask.
 * - `data-rise`: a block rises and fades in (the value adds a delay in ms).
 * - `data-rise-group`: its children rise one after another.
 * - `data-unveil`: an image frame opens from the bottom while the photo
 *   settles from a slow push-in.
 * - `data-magnetic`: a call to action leans toward a fine pointer.
 *
 * Elements that arrive in view together play in reading order. On a
 * client-side navigation everything waits for the route curtain to open.
 * Runs before paint on every route, so nothing flashes in its final place,
 * and does nothing under reduced motion (the content is simply there).
 */
export function MotionDirector() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!motionAllowed()) {
      root.removeAttribute("data-motion");
      root.removeAttribute("data-motion-live");
      return;
    }
    root.setAttribute("data-motion", "on");

    let stop: (() => void) | undefined;
    let frame = 0;
    const deadline = performance.now() + HYDRATION_WAIT_MS;
    const begin = () => {
      const pending = document.querySelectorAll(`${SPLIT}, ${RISE}, ${UNVEIL}`);
      if (
        performance.now() < deadline &&
        Array.from(pending).some((element) => !isHydrated(element))
      ) {
        frame = requestAnimationFrame(begin);
        return;
      }
      stop = start();
    };
    // usually everything is hydrated already, so this runs before paint
    begin();

    return () => {
      cancelAnimationFrame(frame);
      stop?.();
    };
  }, [pathname]);

  return null;
}

/** Sets up every animation on the page; returns its cleanup. */
function start() {
  const root = document.documentElement;
  {
    const { ScrollTrigger, SplitText } = motionPlugins();

    const players = new Map<Element, Player>();
    const cleanups: (() => void)[] = [];
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(SPLIT).forEach((heading) => {
        let animation: gsap.core.Tween | null = null;
        let started = false;
        SplitText.create(heading, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit(self) {
            // re-splits (fonts loading, resizes) keep the animation's place
            animation = gsap.from(self.lines, {
              yPercent: 112,
              duration: 1.15,
              ease: EASE.enter,
              stagger: 0.09,
              paused: !started,
            });
            return animation;
          },
        });
        players.set(heading, (delay) => {
          started = true;
          animation?.delay(delay).restart(true);
        });
      });

      gsap.utils.toArray<HTMLElement>(RISE).forEach((block) => {
        const extra = Number(block.dataset.rise || 0) / 1000;
        // CSS transitions on the block would smear every frame of the tween
        gsap.set(block, { autoAlpha: 0, y: 36, transition: "none" });
        players.set(block, (delay) =>
          ctx.add(() =>
            gsap.to(block, {
              autoAlpha: 1,
              y: 0,
              duration: 1.1,
              ease: EASE.enter,
              delay: delay + extra,
              clearProps: "opacity,visibility,transform,transition",
            }),
          ),
        );
      });

      gsap.utils.toArray<HTMLElement>(UNVEIL).forEach((frame) => {
        const media = frame.querySelector("img, video");
        const radius = getComputedStyle(frame).borderTopLeftRadius || "0px";
        gsap.set(frame, { clipPath: `inset(100% 0% 0% 0% round ${radius})` });
        if (media) gsap.set(media, { scale: 1.18, transition: "none" });
        players.set(frame, (delay) =>
          ctx.add(() => {
            gsap.to(frame, {
              clipPath: `inset(0% 0% 0% 0% round ${radius})`,
              duration: 1.25,
              ease: EASE.wipe,
              delay,
              clearProps: "clipPath",
            });
            if (media) {
              gsap.to(media, {
                scale: 1,
                duration: 1.8,
                ease: EASE.enter,
                delay,
                clearProps: "transform,transition",
              });
            }
          }),
        );
      });

      if (finePointer()) {
        gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((target) => {
          const toX = gsap.quickTo(target, "x", {
            duration: 0.5,
            ease: "power3.out",
          });
          const toY = gsap.quickTo(target, "y", {
            duration: 0.5,
            ease: "power3.out",
          });
          const move = (event: PointerEvent) => {
            const box = target.getBoundingClientRect();
            toX((event.clientX - (box.left + box.width / 2)) * 0.28);
            toY((event.clientY - (box.top + box.height / 2)) * 0.36);
          };
          const leave = () => {
            gsap.to(target, {
              x: 0,
              y: 0,
              duration: 0.9,
              ease: "elastic.out(1, 0.45)",
            });
          };
          target.addEventListener("pointermove", move);
          target.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            target.removeEventListener("pointermove", move);
            target.removeEventListener("pointerleave", leave);
          });
        });
      }
    });

    const targets = gsap.utils.toArray<HTMLElement>(
      `${SPLIT}, ${RISE}, ${UNVEIL}`,
    );
    cleanups.push(
      whenCurtainOpens(() =>
        ctx.add(() =>
          ScrollTrigger.batch(targets, {
            start: "top 92%",
            once: true,
            onEnter: (batch) =>
              batch.forEach((element, index) =>
                players.get(element)?.(index * STAGGER),
              ),
          }),
        ),
      ),
    );
    // from here on the inline states above are in charge, not the CSS hold
    root.setAttribute("data-motion-live", "");

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      ctx.revert();
    };
  }
}
