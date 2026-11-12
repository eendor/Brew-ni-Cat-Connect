import * as THREE from "three";

import { addFrame } from "@/components/three/engine/loop";
import { bindPointer, pointer } from "@/components/three/engine/runtime";
import { EXPOSURE, TONE_MAPPING } from "@/components/three/engine/studio";
import { SHOP_CATS, type Perch } from "@/lib/cats/cats";

import { buildCat, type CatModel, disposeCatMaterials } from "./cat-model";

/** What the stage needs to know about one perch, read every frame. */
export type StageSlot = Readonly<{
  perch: Perch;
  /** The cat on this perch, or null. */
  catId: () => string | null;
  /** Where the cat sits on screen (CSS pixels), or null while away. */
  frame: () => {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  /** 0 = tucked away past its edge, 1 = in place. Animated by anime.js. */
  rise: () => number;
}>;

export type CatStage = {
  /** The cat on `index` meows (head up, mouth open). */
  meow: (index: number) => void;
  /** Draws one frame now (reduced motion: the stage only draws on demand). */
  draw: () => void;
  dispose: () => void;
};

type Built = {
  model: CatModel;
  size: THREE.Vector3;
  center: THREE.Vector3;
  shadow: THREE.Mesh;
};

/** Side cats turn in toward the page; bottom cats look out a little. */
function turnFor(perch: Perch) {
  const y =
    perch.side === "left"
      ? 0.55
      : perch.side === "right"
        ? -0.55
        : (perch.at - 0.5) * -0.6;
  return new THREE.Euler(0.12, y, 0);
}

/** A soft round shadow under each cat, drawn once on a canvas. */
function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, "rgba(40,28,20,0.5)");
    gradient.addColorStop(1, "rgba(40,28,20,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * One transparent canvas over the whole screen, with an orthographic camera
 * in CSS pixels, so each cat is drawn exactly in its perch's box. Every cat
 * on screen breathes, blinks, twitches an ear, swishes its tail and turns
 * its head toward the pointer. With `still` (reduced motion) they hold one
 * pose and the canvas is only redrawn when a cat comes or goes.
 */
export function createCatStage(
  canvas: HTMLCanvasElement,
  slots: readonly StageSlot[],
  still: boolean,
): CatStage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = TONE_MAPPING;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  camera.position.z = 1000;

  // warm café light: soft sky, a key from the top left, a cool rim behind
  scene.add(new THREE.HemisphereLight("#fff4e4", "#6b5a4a", 1.6));
  const key = new THREE.DirectionalLight("#fff1dc", 2.2);
  key.position.set(-0.6, 1, 0.9);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#cfe3ff", 1.1);
  rim.position.set(0.8, 0.4, -1);
  scene.add(rim);

  const shadowMap = shadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
  });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);

  const built = new Map<string, Built>();
  /** Which built cat each slot showed last frame. */
  const onSlot: (Built | null)[] = slots.map(() => null);

  const build = (id: string, index: number): Built | null => {
    const key = `${id}#${index}`;
    const existing = built.get(key);
    if (existing) return existing;
    const cat = SHOP_CATS.find((c) => c.id === id);
    if (!cat) return null;
    const model = buildCat(
      cat.look,
      cat.pose,
      SHOP_CATS.indexOf(cat) + 1 + index * 7,
    );
    // measure it in its idle pose, turned the way it will sit
    model.update(0, 0, { x: 0, y: 0 });
    model.root.rotation.copy(turnFor(slots[index]!.perch));
    const box = new THREE.Box3().setFromObject(model.root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.renderOrder = -1;
    scene.add(model.root, shadow);
    const entry = { model, size, center, shadow };
    built.set(key, entry);
    return entry;
  };

  let width = 0;
  let height = 0;
  /** Cats drawn last frame; -1 forces a redraw (reduced motion). */
  let lastShown = -1;
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.left = 0;
    camera.right = width;
    camera.top = 0;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
    lastShown = -1;
  };
  resize();
  window.addEventListener("resize", resize);
  bindPointer();

  const look = { x: 0, y: 0 };

  const frame = (dt: number, time: number) => {
    let shown = 0;
    let moving = false;
    slots.forEach((slot, index) => {
      const id = slot.catId();
      const box = slot.frame();
      const rise = slot.rise();
      const entry = id && box && rise > 0.001 ? build(id, index) : null;
      const previous = onSlot[index];
      if (previous && previous !== entry) {
        previous.model.root.visible = false;
        previous.shadow.visible = false;
      }
      onSlot[index] = entry;
      if (!entry || !box) return;
      shown += 1;
      if (rise < 0.999) moving = true;

      const { model, size, center, shadow } = entry;
      // fit the model to its box, standing on the box's bottom
      // (a little padding so nothing touches the screen edge)
      const scale = Math.min(
        (box.width * 0.9) / size.x,
        (box.height * 0.96) / size.y,
      );
      const root = model.root;
      root.visible = true;
      root.scale.setScalar(scale);
      const side = slot.perch.side;
      // side cats turn in toward the page; bottom cats look out a little
      root.rotation.copy(turnFor(slot.perch));
      const cx = box.left + box.width / 2 - center.x * scale;
      const floor = box.top + box.height;
      let x = cx;
      let y = floor;
      const away = 1 - rise;
      if (side === "left") x -= away * (box.left + box.width + 20);
      else if (side === "right") x += away * (width - box.left + 20);
      else y += away * box.height * 1.1;
      root.position.set(x, -y, 0);

      shadow.visible = side !== "bottom";
      shadow.position.set(
        box.left + box.width / 2 + (x - cx),
        -floor + 2,
        -500,
      );
      shadow.scale.set(box.width * 0.9, box.width * 0.22, 1);
      (shadow.material as THREE.MeshBasicMaterial).opacity = rise;

      if (!still) {
        // the pointer, relative to this cat's head
        const headX = box.left + box.width / 2;
        const headY = box.top + box.height * 0.25;
        if (pointer.px > -9000) {
          look.x = Math.max(
            -1,
            Math.min(1, (pointer.px - headX) / (width * 0.5)),
          );
          look.y = Math.max(
            -1,
            Math.min(1, (pointer.py - headY) / (height * 0.5)),
          );
        } else {
          look.x = side === "left" ? 0.3 : side === "right" ? -0.3 : 0;
          look.y = -0.1;
        }
        // undo the body's turn so the head looks at the pointer, not past it
        const turn = side === "left" ? 0.55 : side === "right" ? -0.55 : 0;
        model.update(dt, time, { x: look.x - turn * 0.6, y: look.y });
      }
    });
    if (still && !moving && shown === lastShown) return;
    lastShown = shown;
    renderer.render(scene, camera);
  };

  const stop = addFrame(frame);

  return {
    meow(index) {
      onSlot[index]?.model.meow();
    },
    draw() {
      lastShown = -1;
      frame(0, 0);
    },
    dispose() {
      stop();
      window.removeEventListener("resize", resize);
      for (const { model } of built.values()) model.dispose();
      built.clear();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      shadowMap.dispose();
      disposeCatMaterials();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
