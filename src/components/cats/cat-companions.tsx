"use client";

import { animate, type JSAnimation } from "animejs";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  onCurtainCloses,
  whenCurtainSettles,
} from "@/components/motion/curtain-state";
import {
  type Box,
  boxesOverlap,
  BOTTOM_TUCK,
  catCount,
  catHeight,
  catsFor,
  catSrc,
  PERCHES,
  type Perch,
  perchBox,
  type ShopCat,
  SIDE_TUCK,
  stayMs,
} from "@/lib/cats/cats";
import { meow } from "@/lib/sound/cat-sounds";

/**
 * What a cat must never sit on: text, controls, pictures and cards. A spot
 * is clear only when none of these is within it. Decorative layers
 * (aria-hidden) don't count.
 */
const CONTENT =
  "a, button, input, select, textarea, label, p, h1, h2, h3, h4, h5, h6, li, dt, dd, td, th, img, picture, video, figure, svg, blockquote, form, article, header, nav, [role=dialog], [class*='rounded-'], [data-cat-avoid]";

type Slot = {
  perch: Perch;
  node: HTMLImageElement;
  cat: ShopCat | null;
  shown: boolean;
  box: Box | null;
  until: number;
  motion: JSAnimation | null;
  idle: JSAnimation | null;
};

function reducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Room kept between a cat and the page's content, in pixels. */
const MARGIN = 10;

/**
 * The boxes of everything a cat must keep clear of, on screen now. Content
 * still faded out (waiting for its entrance) counts too, so a cat never
 * sits where text is about to appear.
 */
export function contentBoxes(layer: Element): Box[] {
  const boxes: Box[] = [];
  const width = window.innerWidth;
  const height = window.innerHeight;
  for (const element of document.querySelectorAll(CONTENT)) {
    if (layer.contains(element)) continue;
    if (element.closest('[aria-hidden="true"]')) continue;
    const r = element.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.bottom < 0 || r.top > height || r.right < 0 || r.left > width)
      continue;
    if (
      typeof element.checkVisibility === "function" &&
      !element.checkVisibility({ visibilityProperty: true })
    )
      continue;
    boxes.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }
  return boxes;
}

/** True when none of the page's content is within the box (plus a margin). */
export function spotIsClear(box: Box, content: readonly Box[]): boolean {
  return !content.some((other) => boxesOverlap(box, other, MARGIN));
}

/** The hidden offset of a cat: tucked fully past its edge. */
function away(perch: Perch, w: number, h: number) {
  if (perch.side === "left") return { translateX: -w, translateY: 0 };
  if (perch.side === "right") return { translateX: w, translateY: 0 };
  return { translateX: 0, translateY: h };
}

/**
 * The shop's cats perched around the page (FR-099, ADR-032): on the left
 * and right edges of the screen, peeking in, and rising from its bottom.
 * They scale with the screen. A cat only comes out where nothing on the
 * page is under it, and ducks away as soon as text, a control, a picture or
 * a card scrolls beneath it, so the cats never cover the page. Every so
 * often another cat takes a spot. anime.js moves them; with reduced motion
 * they simply appear and stay still. Page transitions get a soft meow
 * (switchable in the footer). The layer is aria-hidden and ignores taps.
 */
export function CatCompanions() {
  const layer = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const recheck = useRef<() => void>(() => {});

  useEffect(() => onCurtainCloses(() => void meow()), []);

  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    const still = reducedMotion();
    const slots: Slot[] = [
      ...element.querySelectorAll<HTMLImageElement>(".shop-cat"),
    ].map((node, index) => ({
      perch: PERCHES[index]!,
      node,
      cat: null,
      shown: false,
      box: null,
      until: 0,
      motion: null,
      idle: null,
    }));
    let used = 0;

    const size = (cat: ShopCat) => {
      const h = catHeight(window.innerWidth, window.innerHeight);
      // a lying cat is wide: keep it a little lower
      const height = cat.pose === "lie" ? h * 0.8 : h;
      return { w: (cat.width / cat.height) * height, h: height };
    };

    const pick = (slot: Slot) => {
      const options = catsFor(slot.perch).filter(
        (cat) => !slots.some((s) => s !== slot && s.cat?.id === cat.id),
      );
      const pool = options.length ? options : catsFor(slot.perch);
      return pool[
        (used++ * 3 + Math.floor(Math.random() * pool.length)) % pool.length
      ]!;
    };

    const placeNode = (slot: Slot, cat: ShopCat) => {
      const { w, h } = size(cat);
      const { node, perch } = slot;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      node.src = catSrc(cat.id);
      node.dataset.cat = cat.id;
      node.style.width = `${w}px`;
      node.style.height = `${h}px`;
      if (perch.side === "bottom") {
        const box = perchBox(perch, w, h, vw, vh);
        node.style.left = `${box.left}px`;
        node.style.top = `${vh - h * (1 - BOTTOM_TUCK)}px`;
      } else {
        const box = perchBox(perch, w, h, vw, vh);
        node.style.top = `${box.top}px`;
        node.style.left =
          perch.side === "left"
            ? `${-w * SIDE_TUCK}px`
            : `${vw - w * (1 - SIDE_TUCK)}px`;
      }
      return { w, h };
    };

    const hide = (slot: Slot, then?: () => void) => {
      if (!slot.shown) {
        then?.();
        return;
      }
      slot.shown = false;
      slot.node.dataset.shown = "false";
      slot.idle?.pause();
      slot.motion?.pause();
      if (still || !slot.cat) {
        slot.node.style.opacity = "0";
        then?.();
        return;
      }
      const { w, h } = size(slot.cat);
      slot.motion = animate(slot.node, {
        ...away(slot.perch, w, h),
        opacity: 0,
        duration: 380,
        ease: "inBack(1.4)",
        onComplete: () => then?.(),
      });
    };

    const show = (slot: Slot, cat: ShopCat) => {
      slot.cat = cat;
      slot.shown = true;
      slot.until = performance.now() + stayMs(Math.random());
      slot.node.dataset.shown = "true";
      const { w, h } = placeNode(slot, cat);
      slot.motion?.pause();
      slot.idle?.pause();
      if (still) {
        slot.node.style.opacity = "1";
        slot.node.style.transform = "";
        return;
      }
      const from = away(slot.perch, w, h);
      const tilt =
        slot.perch.side === "left" ? 6 : slot.perch.side === "right" ? -6 : 0;
      slot.motion = animate(slot.node, {
        translateX: [from.translateX, 0],
        translateY: [from.translateY, 0],
        rotate: [0, tilt],
        opacity: [0, 1],
        duration: 760,
        ease: "outBack(1.6)",
        onComplete: () => {
          // a slow sway while it sits
          slot.idle = animate(slot.node, {
            rotate: [tilt - 2, tilt + 2],
            scaleY: [1, 1.025],
            duration: 2600 + Math.random() * 900,
            ease: "inOutSine",
            alternate: true,
            loop: true,
          });
        },
      });
    };

    /** Takes cats away from spots that are no longer clear. */
    const clearCovered = () => {
      const content = contentBoxes(element);
      for (const slot of slots)
        if (slot.shown && slot.box && !spotIsClear(slot.box, content))
          hide(slot);
    };

    /** Fills clear spots with cats, up to the screen's count. */
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const taken: Box[] = [];
      const content = contentBoxes(element);
      let count = 0;
      const limit = catCount(vw);
      for (const slot of slots) {
        const cat = slot.cat ?? pick(slot);
        const { w, h } = size(cat);
        const box = perchBox(slot.perch, w, h, vw, vh);
        const free =
          count < limit &&
          !taken.some((other) => boxesOverlap(box, other, 12)) &&
          spotIsClear(box, content);
        if (free) {
          taken.push(box);
          count += 1;
          slot.box = box;
          if (!slot.shown) show(slot, cat);
          else if (!still && performance.now() > slot.until) {
            // another cat takes the spot
            hide(slot, () => show(slot, pick(slot)));
          }
        } else {
          hide(slot);
        }
      }
    };
    recheck.current = place;

    let idleTimer = 0;
    let lastQuick = 0;
    const onScroll = () => {
      const now = performance.now();
      if (now - lastQuick > 120) {
        lastQuick = now;
        clearCovered();
      }
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(place, 350);
    };
    const onResize = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(place, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // layout changes (menus, dialogs, images loading) are caught here
    const tick = window.setInterval(() => {
      if (!document.hidden) place();
    }, 2500);
    const stopWaiting = whenCurtainSettles(place);

    return () => {
      stopWaiting();
      window.clearInterval(tick);
      window.clearTimeout(idleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      for (const slot of slots) {
        slot.motion?.pause();
        slot.idle?.pause();
      }
    };
  }, []);

  // a new page: recheck once its content is in place
  useEffect(() => {
    const id = window.setTimeout(() => recheck.current(), 600);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div
      ref={layer}
      className="cat-layer"
      data-testid="cat-layer"
      aria-hidden="true"
    >
      {PERCHES.map((perch, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- decorative cut-outs placed and sized by script
        <img
          key={index}
          className="shop-cat"
          data-side={perch.side}
          data-shown="false"
          alt=""
          draggable={false}
          decoding="async"
        />
      ))}
    </div>
  );
}
