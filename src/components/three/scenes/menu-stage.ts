import * as THREE from "three";

import { addFrame } from "../engine/loop";
import {
  disposeScene,
  makeRenderer,
  releaseRenderer,
  studioEnvironment,
} from "../engine/renderer";
import { FrameBudget, damp, type Quality } from "../engine/runtime";
import type { ModelSpec } from "../menu-models";
import {
  buildModel,
  disposeModel,
  spinTargets,
  sweptBox,
  type ModelUpdate,
} from "./menu-models-3d";
import { contactShadowTexture } from "./models";

const CAMERA_Z = 11;
/** The camera always shows at least this half-frame at the model (4:3). */
const FRAME_HALF_W = 4.27;
const FRAME_HALF_H = 3.2;
/** Largest model height and width inside that frame. */
const MAX_H = 4.3;
const MAX_W = 6;
/** Radians per dragged pixel, the throw's slow-down and the idle turn. */
const DRAG_SPEED = 0.011;
const INERTIA = 2.6;
const AUTO_SPIN = 0.38;
const IDLE_AFTER = 1.6;
/** Seconds a model takes to settle in, and the float's height and pace. */
const POP = 0.45;
const BOB_HEIGHT = 0.09;
const BOB_PACE = 1.35;
/** The shared drawing buffer, in device pixels. */
const BUFFER_W = 640;
const BUFFER_H = 480;
/** How far from the screen a card still holds a built model. */
const NEAR_MARGIN = "700px 0px";

export type StageCallbacks = Readonly<{
  onReady?: () => void;
  onError?: () => void;
}>;

export type StageSlot = Readonly<{
  setSpec: (spec: ModelSpec) => void;
  dispose: () => void;
}>;

type Slot = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  callbacks: StageCallbacks;
  spec: ModelSpec;
  /** Close enough to the screen to hold a built model. */
  near: boolean;
  /** On screen, so it is drawn each frame. */
  shown: boolean;
  /** The box it is shown in (CSS px) and the pixels it is drawn at. */
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  holder: THREE.Group | null;
  built: string;
  ticket: number;
  scale: number;
  floorY: number;
  footprint: THREE.Vector2;
  spin: ReadonlyArray<Readonly<{ target: THREE.Object3D; base: number }>>;
  update: ModelUpdate | undefined;
  pop: number;
  phase: number;
  angle: number;
  velocity: number;
  idleSince: number;
  drag: { id: number; x: number; at: number };
  drawn: boolean;
  failed: boolean;
  disposed: boolean;
  listeners: ReadonlyArray<readonly [string, (event: PointerEvent) => void]>;
};

export type MenuStage = Awaited<ReturnType<typeof initMenuStage>>;

/**
 * One WebGL context draws every Menu card's model. Each card owns a plain 2D
 * canvas; every frame the stage renders the cards on screen into a shared
 * buffer and copies the picture across. The copy keeps a model glued to its
 * card while the page scrolls, and only one context exists however long the
 * menu is. Models are built when a card nears the screen and freed when it
 * is far away; a card left behind keeps its last picture.
 */
export async function initMenuStage(quality: Quality) {
  const glCanvas = document.createElement("canvas");
  const renderer = makeRenderer(glCanvas, quality, { alpha: true });
  let env: THREE.Texture;
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(BUFFER_W, BUFFER_H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.transmissionResolutionScale = quality.mobile ? 0.5 : 0.75;
    env = await studioEnvironment(renderer);
  } catch (error) {
    releaseRenderer(glCanvas);
    throw error;
  }

  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.85;
  const camera = new THREE.PerspectiveCamera(32, 4 / 3, 0.1, 100);
  camera.position.set(0, 0.2, CAMERA_Z);

  const key = new THREE.DirectionalLight("#fff4e6", 2.2);
  key.position.set(3.5, 6, 6);
  const fill = new THREE.DirectionalLight("#dfe6ff", 0.4);
  fill.position.set(-6, 2, 4);
  const rim = new THREE.DirectionalLight("#7CFF6B", 1.6);
  rim.position.set(-3, 2, -4);
  scene.add(key, fill, rim);

  // a soft blob under whichever model is being drawn
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  scene.add(contact);

  const slots = new Set<Slot>();
  const byCanvas = new Map<Element, Slot>();
  let disposed = false;
  let heavy = false;
  let carry = 0;
  let skip = false;

  const budget = new FrameBudget(
    42,
    () => {
      heavy = true;
      renderer.transmissionResolutionScale = 0.35;
    },
    quality.forceHigh,
  );

  // models build one at a time, so a long menu never stalls a frame
  let queue: Promise<void> = Promise.resolve();
  function enqueue(task: () => Promise<void>) {
    queue = queue.then(task).catch(() => {});
  }

  function fail(slot: Slot) {
    if (slot.failed || slot.disposed) return;
    slot.failed = true;
    slot.callbacks.onError?.();
  }

  function freeModel(slot: Slot) {
    if (!slot.holder) return;
    scene.remove(slot.holder);
    disposeModel(slot.holder);
    slot.holder = null;
    slot.built = "";
  }

  async function load(slot: Slot, mine: number) {
    const spec = slot.spec;
    const stale = () =>
      disposed || slot.disposed || !slot.near || mine !== slot.ticket;
    if (stale()) return;
    try {
      const model = await buildModel(spec, quality.mobile);
      if (stale()) {
        disposeModel(model);
        return;
      }
      // measured on its own, then set down with its footprint centered
      const box = sweptBox(model);
      const size = box.getSize(new THREE.Vector3());
      const fit = (model.userData.fit as THREE.Vector3 | undefined) ?? size;
      const scale = Math.min(MAX_H / fit.y, MAX_W / Math.max(fit.x, fit.z));
      model.position.x -= (box.min.x + box.max.x) / 2;
      model.position.y -= box.min.y;
      model.position.z -= (box.min.z + box.max.z) / 2;
      const holder = new THREE.Group();
      holder.add(model);
      scene.add(holder);
      try {
        await renderer.compileAsync(holder, camera);
      } catch {
        // the first frame compiles whatever is left
      }
      holder.visible = false;
      if (stale()) {
        scene.remove(holder);
        disposeModel(holder);
        return;
      }
      freeModel(slot);
      slot.holder = holder;
      slot.built = spec.key;
      slot.scale = scale;
      slot.floorY = (-scale * fit.y) / 2;
      slot.footprint.set(scale * size.x * 1.1, scale * size.z * 1.1);
      slot.spin = spinTargets(model).map((target) => ({
        target,
        base: target.rotation.y,
      }));
      slot.update = model.userData.update as ModelUpdate | undefined;
      slot.pop = 0;
      holder.position.y = slot.floorY;
      holder.scale.setScalar(scale * 0.9);
    } catch (error) {
      console.warn("3D model unavailable, keeping the card as it is", error);
      fail(slot);
    }
  }

  function requestBuild(slot: Slot) {
    if (disposed || slot.disposed || slot.failed || !slot.near) return;
    if (slot.built === slot.spec.key) return;
    const mine = ++slot.ticket;
    enqueue(() => load(slot, mine));
  }

  function measure(slot: Slot) {
    const width = Math.max(1, slot.canvas.clientWidth);
    const height = Math.max(1, slot.canvas.clientHeight);
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      quality.maxDpr,
      BUFFER_W / width,
      BUFFER_H / height,
    );
    slot.width = width;
    slot.height = height;
    slot.pixelWidth = Math.max(1, Math.round(width * ratio));
    slot.pixelHeight = Math.max(1, Math.round(height * ratio));
    // setting the size clears the picture; a drawn slot repaints next frame
    slot.canvas.width = slot.pixelWidth;
    slot.canvas.height = slot.pixelHeight;
  }

  const shownObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const slot = byCanvas.get(entry.target);
        if (slot) slot.shown = entry.isIntersecting;
      }
    },
    { rootMargin: "40px 0px" },
  );
  const nearObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const slot = byCanvas.get(entry.target);
        if (!slot) continue;
        slot.near = entry.isIntersecting;
        if (slot.near) requestBuild(slot);
        else freeModel(slot);
      }
    },
    { rootMargin: NEAR_MARGIN },
  );
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const slot = byCanvas.get(entry.target);
      if (slot) measure(slot);
    }
  });

  function stepSlot(slot: Slot, dt: number, time: number) {
    const holder = slot.holder;
    if (!holder) return;
    if (slot.drag.id === -1) {
      slot.velocity =
        time - slot.idleSince > IDLE_AFTER
          ? damp(slot.velocity, AUTO_SPIN, 1.5, dt)
          : slot.velocity * Math.exp(-INERTIA * dt);
      slot.angle += slot.velocity * dt;
    }
    for (const { target, base } of slot.spin) {
      target.rotation.y = base + slot.angle;
    }
    slot.pop = Math.min(1, slot.pop + dt / POP);
    const settle = 1 - (1 - slot.pop) ** 3;
    holder.scale.setScalar(slot.scale * (0.9 + 0.1 * settle));
    // it floats a little, so every card feels alive without shouting
    holder.position.y =
      slot.floorY +
      Math.sin(time * BOB_PACE + slot.phase) * BOB_HEIGHT * settle;
    slot.update?.(dt, time);
  }

  function renderSlot(slot: Slot) {
    const holder = slot.holder;
    const context = slot.context;
    const canvas = slot.canvas;
    if (!holder || !context) return;
    for (const other of slots) {
      if (other.holder) other.holder.visible = other === slot;
    }
    camera.aspect = slot.width / slot.height;
    // a narrow card widens the view instead of cropping the model
    const halfHeight = Math.max(FRAME_HALF_H, FRAME_HALF_W / camera.aspect);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfHeight / CAMERA_Z));
    camera.updateProjectionMatrix();
    contact.position.y = slot.floorY + 0.01;
    contact.scale.set(slot.footprint.x, slot.footprint.y, 1);
    rim.color.set(slot.spec.glow);
    const { pixelWidth: w, pixelHeight: h } = slot;
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.setScissorTest(true);
    renderer.clear();
    renderer.render(scene, camera);
    context.clearRect(0, 0, w, h);
    context.drawImage(glCanvas, 0, BUFFER_H - h, w, h, 0, 0, w, h);
    canvas.dataset.model = slot.built;
    if (!slot.drawn) {
      slot.drawn = true;
      slot.callbacks.onReady?.();
    }
  }

  function frame(dt: number, time: number) {
    budget.push(dt * 1000);
    if (disposed) return;
    carry += dt;
    // a slow device draws every other frame and the models keep their pace
    if (heavy) {
      skip = !skip;
      if (skip) return;
    }
    const step = carry;
    carry = 0;
    const middle = window.innerHeight / 2;
    const live: Array<{ slot: Slot; distance: number }> = [];
    for (const slot of slots) {
      if (!slot.holder || !slot.shown) continue;
      const rect = slot.canvas.getBoundingClientRect();
      live.push({
        slot,
        distance: Math.abs(rect.top + rect.height / 2 - middle),
      });
    }
    if (live.length === 0) return;
    live.sort((a, b) => a.distance - b.distance);
    const cap = heavy ? 2 : quality.mobile ? 3 : 6;
    for (const { slot } of live.slice(0, cap)) {
      stepSlot(slot, step, time);
      renderSlot(slot);
    }
  }

  const onContextLost = (event: Event) => {
    event.preventDefault();
    for (const slot of slots) fail(slot);
  };
  glCanvas.addEventListener("webglcontextlost", onContextLost);
  const stop = addFrame(frame);

  /** Gives a card's canvas a model; the stage draws it until disposed. */
  function attach(
    canvas: HTMLCanvasElement,
    spec: ModelSpec,
    callbacks: StageCallbacks = {},
  ): StageSlot {
    const slot: Slot = {
      canvas,
      context: canvas.getContext("2d"),
      callbacks,
      spec,
      near: false,
      shown: false,
      width: 1,
      height: 1,
      pixelWidth: 1,
      pixelHeight: 1,
      holder: null,
      built: "",
      ticket: 0,
      scale: 1,
      floorY: 0,
      footprint: new THREE.Vector2(1, 1),
      spin: [],
      update: undefined,
      pop: 0,
      phase: Math.random() * Math.PI * 2,
      angle: 0,
      velocity: 0,
      idleSince: -Infinity,
      drag: { id: -1, x: 0, at: 0 },
      drawn: false,
      failed: false,
      disposed: false,
      listeners: [],
    };

    // drag to spin, with a throw that slows down, then the idle turn
    const onDown = (event: PointerEvent) => {
      if (slot.drag.id !== -1 || event.button !== 0) return;
      slot.drag = {
        id: event.pointerId,
        x: event.clientX,
        at: event.timeStamp,
      };
      slot.velocity = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== slot.drag.id) return;
      const turn = (event.clientX - slot.drag.x) * DRAG_SPEED;
      const seconds = Math.max(0.008, (event.timeStamp - slot.drag.at) / 1000);
      slot.drag.x = event.clientX;
      slot.drag.at = event.timeStamp;
      slot.angle += turn;
      slot.velocity = THREE.MathUtils.clamp(
        slot.velocity * 0.5 + (turn / seconds) * 0.5,
        -14,
        14,
      );
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== slot.drag.id) return;
      // a drag that stopped before letting go doesn't throw
      if (event.timeStamp - slot.drag.at > 90) slot.velocity = 0;
      slot.drag = { id: -1, x: 0, at: 0 };
      slot.idleSince = performance.now() / 1000;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.classList.remove("is-dragging");
    };
    slot.listeners = [
      ["pointerdown", onDown],
      ["pointermove", onMove],
      ["pointerup", onUp],
      ["pointercancel", onUp],
    ];
    for (const [name, handler] of slot.listeners) {
      canvas.addEventListener(name, handler as EventListener);
    }

    slots.add(slot);
    byCanvas.set(canvas, slot);
    measure(slot);
    shownObserver.observe(canvas);
    nearObserver.observe(canvas);
    resizeObserver.observe(canvas);

    return {
      setSpec(next) {
        if (slot.disposed || next.key === slot.spec.key) return;
        slot.spec = next;
        requestBuild(slot);
      },
      dispose() {
        if (slot.disposed) return;
        slot.disposed = true;
        for (const [name, handler] of slot.listeners) {
          canvas.removeEventListener(name, handler as EventListener);
        }
        shownObserver.unobserve(canvas);
        nearObserver.unobserve(canvas);
        resizeObserver.unobserve(canvas);
        slots.delete(slot);
        byCanvas.delete(canvas);
        freeModel(slot);
      },
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    glCanvas.removeEventListener("webglcontextlost", onContextLost);
    shownObserver.disconnect();
    nearObserver.disconnect();
    resizeObserver.disconnect();
    for (const slot of slots) freeModel(slot);
    slots.clear();
    byCanvas.clear();
    disposeScene(scene, renderer);
    releaseRenderer(glCanvas);
  }

  return { attach, dispose };
}
