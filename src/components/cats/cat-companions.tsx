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
  catCount,
  catHeight,
  catsFor,
  PERCHES,
  type Perch,
  perchBox,
  type ShopCat,
  SIDE_TUCK,
  tuckFor,
  stayMs,
} from "@/lib/cats/cats";
import { meow } from "@/lib/sound/cat-sounds";

import type { CatStage } from "./cat-stage";

/**
 * What a cat must never sit on: text, controls, pictures and cards. A spot
 * is clear only when none of these is within it. Decorative layers
 * (aria-hidden) don't count.
 */
const CONTENT =
  "a, button, input, select, textarea, label, p, h1, h2, h3, h4, h5, h6, li, dt, dd, td, th, img, picture, video, figure, svg, blockquote, form, article, header, nav, [role=dialog], [class*='rounded-'], [data-cat-avoid]";

type Slot = {
  perch: Perch;
  /** An empty box where the cat sits: what the page and tests measure. */
  node: HTMLElement;
  cat: ShopCat | null;
  shown: boolean;
  box: Box | null;
  until: number;
  motion: JSAnimation | null;
  /** 0 = tucked away past its edge, 1 = in place; anime.js moves it. */
  pose: { rise: number };
};

/** WebGL2 without touching jsdom's unimplemented canvas API. */
function canDraw3d() {
  if (typeof window.WebGL2RenderingContext === "undefined") return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

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

/**
 * The shop's cats perched around the page (FR-099, ADR-032): 3D cats built
 * from three.js geometry, after the shop's own cats, sitting on the left and
 * right edges of the screen and peeking up from its bottom. They scale with
 * the screen. A cat only comes out where nothing on the page is under it,
 * and ducks away as soon as text, a control, a picture or a card scrolls
 * beneath it, so the cats never cover the page. Every so often another cat
 * takes a spot. anime.js slides them in and out; three.js keeps them alive
 * (breathing, blinking, ear twitches, tail swishes, heads turning to the
 * pointer). With reduced motion they simply appear and hold still. Page
 * transitions get a soft meow (switchable in the footer). The layer is
 * aria-hidden and ignores taps; without WebGL there are no cats.
 */
export function CatCompanions() {
  const layer = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const canvas = useRef<HTMLCanvasElement>(null);
  const recheck = useRef<() => void>(() => {});
  const meowCat = useRef<() => void>(() => {});

  useEffect(
    () =>
      onCurtainCloses(() => {
        if (meow()) meowCat.current();
      }),
    [],
  );

  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    const still = reducedMotion();
    const slots: Slot[] = [
      ...element.querySelectorAll<HTMLElement>(".shop-cat"),
    ].map((node, index) => ({
      perch: PERCHES[index]!,
      node,
      cat: null,
      shown: false,
      box: null,
      until: 0,
      motion: null,
      pose: { rise: 0 },
    }));
    let used = 0;
    let stage: CatStage | null = null;
    let closed = false;
    const redraw = () => stage?.draw();

    // the 3D cats load on their own, after the page
    const surface = canvas.current;
    if (surface && canDraw3d()) {
      void import("./cat-stage")
        .then(({ createCatStage }) => {
          if (closed) return;
          stage = createCatStage(
            surface,
            slots.map((slot) => ({
              perch: slot.perch,
              catId: () => slot.cat?.id ?? null,
              frame: () =>
                slot.cat && slot.pose.rise > 0
                  ? {
                      left: Number.parseFloat(slot.node.style.left),
                      top: Number.parseFloat(slot.node.style.top),
                      width: Number.parseFloat(slot.node.style.width),
                      height: Number.parseFloat(slot.node.style.height),
                    }
                  : null,
              rise: () => slot.pose.rise,
            })),
            still,
          );
          redraw();
        })
        .catch((error: unknown) => {
          console.warn("Cats unavailable", error);
        });
    }
    meowCat.current = () => {
      const on = slots.flatMap((slot, i) => (slot.shown ? [i] : []));
      if (on.length) stage?.meow(on[Math.floor(Math.random() * on.length)]!);
    };

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
      node.dataset.cat = cat.id;
      node.style.width = `${w}px`;
      node.style.height = `${h}px`;
      const box = perchBox(perch, w, h, vw, vh, tuckFor(cat));
      if (perch.side === "bottom") {
        node.style.left = `${box.left}px`;
        node.style.top = `${vh - h * (1 - tuckFor(cat))}px`;
      } else {
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
      slot.motion?.pause();
      if (still || !slot.cat) {
        slot.pose.rise = 0;
        redraw();
        then?.();
        return;
      }
      slot.motion = animate(slot.pose, {
        rise: 0,
        duration: 420,
        ease: "inBack(1.3)",
        onComplete: () => then?.(),
      });
    };

    const show = (slot: Slot, cat: ShopCat) => {
      slot.cat = cat;
      slot.shown = true;
      slot.until = performance.now() + stayMs(Math.random());
      slot.node.dataset.shown = "true";
      placeNode(slot, cat);
      slot.motion?.pause();
      if (still) {
        slot.pose.rise = 1;
        redraw();
        return;
      }
      slot.pose.rise = 0;
      slot.motion = animate(slot.pose, {
        rise: 1,
        duration: 900,
        ease: "outBack(1.5)",
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
        const box = perchBox(slot.perch, w, h, vw, vh, tuckFor(cat));
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
      closed = true;
      stage?.dispose();
      stopWaiting();
      window.clearInterval(tick);
      window.clearTimeout(idleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      for (const slot of slots) slot.motion?.pause();
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
      <canvas ref={canvas} className="cat-canvas" />
      {PERCHES.map((perch, index) => (
        <div
          key={index}
          className="shop-cat"
          data-side={perch.side}
          data-shown="false"
        />
      ))}
    </div>
  );
}
