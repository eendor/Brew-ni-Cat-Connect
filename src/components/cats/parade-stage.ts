import { addFrame } from "@/components/three/engine/loop";
import type { ShopCat } from "@/lib/cats/cats";
import {
  CAT_FRAME,
  CAT_GROUND_ROW,
  catRow,
  catSheet,
  paradeGaps,
  pixelScale,
  SLEIGH_FRAME,
  SLEIGH_GROUND_ROW,
  SLEIGH_SHEET,
  sleighFrame,
  spriteSpan,
  walkFrame,
} from "@/lib/cats/sprites";

/** Where the parade is, read every frame (anime.js moves it). */
export type ParadeState = {
  /** The lead cat's nose, in CSS pixels from the strip's left edge. */
  x: number;
  /** 1 walking right, -1 walking left. */
  dir: 1 | -1;
  /** 0 standing still .. 1 walking. */
  stride: number;
  /** 0 looking ahead .. 1 looking out at the visitor. */
  look: number;
};

export type ParadeStage = {
  /** The parade's length in CSS pixels, nose to sleigh. */
  span: () => number;
  /** Cat `index` (lead = 0) meows. */
  meow: (index: number) => void;
  /** Draws now (reduced motion draws only on demand). */
  draw: () => void;
  /** Off while the strip is out of view: nothing is drawn. */
  setVisible: (visible: boolean) => void;
  dispose: () => void;
};

/** How long a cat's mouth stays open for a meow, in seconds. */
const MEOW_S = 0.5;

function sheet(src: string, ready: () => void) {
  const image = new Image();
  image.decoding = "async";
  image.onload = ready;
  image.onerror = () => console.warn("Cat sprite unavailable", src);
  image.src = src;
  return image;
}

/**
 * The parade drawn from the Aseprite sprite sheets on one 2D canvas the size
 * of the strip, pixel for pixel: each sprite pixel is a whole number of
 * device pixels, with no smoothing. The cats face right in the sheets and
 * are mirrored walking left; Luna faces the visitor in the sleigh, so she
 * reads the same both ways. It runs on the shared frame loop (paused while
 * the tab is hidden or the page curtain is closed) and draws nothing while
 * the strip is out of view.
 */
export function createParadeStage(
  canvas: HTMLCanvasElement,
  walkers: readonly ShopCat[],
  state: ParadeState,
  still: boolean,
  festive: boolean,
): ParadeStage {
  const context = canvas.getContext("2d")!;
  let dirty = true;
  const loaded = () => {
    dirty = true;
    if (still) frame(0, clock);
  };
  const sheets = walkers.map((cat) => sheet(catSheet(cat.id), loaded));
  const sleigh = festive ? sheet(SLEIGH_SHEET, loaded) : null;
  const meowUntil = walkers.map(() => -1);
  const { gap, beforeSleigh } = paradeGaps(festive);

  let width = 0;
  let height = 0;
  let dpr = 1;
  /** Device pixels per sprite pixel. */
  let px = 1;
  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    px = pixelScale(width, height, dpr, walkers.length, festive);
    dirty = true;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let visible = true;
  let clock = 0;

  /** Draws one frame of a sheet with its left edge at `left` (device px). */
  const blit = (
    image: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    column: number,
    row: number,
    left: number,
    groundRow: number,
    mirrored: boolean,
  ) => {
    if (!image.complete || image.naturalWidth === 0) return;
    const w = frameWidth * px;
    const h = frameHeight * px;
    const ground = canvas.height - px;
    const top = ground - groundRow * px;
    context.save();
    if (mirrored) {
      context.translate(Math.round(left) + w, 0);
      context.scale(-1, 1);
    } else {
      context.translate(Math.round(left), 0);
    }
    context.drawImage(
      image,
      column * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
      0,
      top,
      w,
      h,
    );
    context.restore();
  };

  /** A soft shadow under a sprite, centred at `centre` (device px). */
  const shadow = (centre: number, length: number) => {
    const ground = canvas.height - px * 1.5;
    context.fillStyle = "rgba(0, 0, 0, 0.18)";
    context.beginPath();
    context.ellipse(centre, ground, length / 2, px * 1.6, 0, 0, Math.PI * 2);
    context.fill();
  };

  const frame = (_dt: number, time: number) => {
    clock = time;
    if (!visible || width === 0) return;
    if (still && !dirty) return;
    dirty = false;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;

    const dir = state.dir;
    const catW = CAT_FRAME.width * px;
    const moving = !still && state.stride > 0;
    // the lead's nose is at state.x; everyone follows behind it
    const nose = state.x * dpr;
    let front = nose;
    walkers.forEach((_cat, i) => {
      if (i > 0) front -= dir * (catW + gap * catW);
      const left = dir > 0 ? front - catW : front;
      shadow(left + catW / 2, catW * 0.62);
      blit(
        sheets[i]!,
        CAT_FRAME.width,
        CAT_FRAME.height,
        walkFrame(time, still ? 0 : state.stride, i),
        catRow(state.look, time < meowUntil[i]!, festive),
        left,
        CAT_GROUND_ROW,
        dir < 0,
      );
    });
    if (sleigh) {
      const sleighW = SLEIGH_FRAME.width * px;
      front -= dir * (catW + beforeSleigh * catW);
      const left = dir > 0 ? front - sleighW : front;
      shadow(left + sleighW / 2, sleighW * 0.8);
      blit(
        sleigh,
        SLEIGH_FRAME.width,
        SLEIGH_FRAME.height,
        sleighFrame(time, moving),
        0,
        left,
        SLEIGH_GROUND_ROW,
        dir < 0,
      );
    }
  };

  const stop = addFrame(frame);

  return {
    span: () => (spriteSpan(walkers.length, festive) * px) / dpr,
    meow(index) {
      if (index < 0 || index >= meowUntil.length) return;
      meowUntil[index] = clock + MEOW_S;
      dirty = true;
      if (still) {
        frame(0, clock);
        window.setTimeout(() => {
          dirty = true;
          frame(0, clock + MEOW_S);
        }, MEOW_S * 1000);
      }
    },
    draw() {
      dirty = true;
      frame(0, clock);
    },
    setVisible(next) {
      visible = next;
      dirty = true;
    },
    dispose() {
      stop();
      observer.disconnect();
      for (const image of [...sheets, sleigh]) {
        if (image) image.onload = image.onerror = null;
      }
    },
  };
}
