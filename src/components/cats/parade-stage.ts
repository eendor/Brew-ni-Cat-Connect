import * as THREE from "three";

import { addFrame } from "@/components/three/engine/loop";
import { EXPOSURE, TONE_MAPPING } from "@/components/three/engine/studio";
import {
  KITTEN_COATS,
  type ShopCat,
  SHOP_CATS,
  SLEIGH_RIDER,
} from "@/lib/cats/cats";

import { buildCat, type CatModel, disposeCatMaterials } from "./cat-model";

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

const BELL = "#d8b45a";
const RIBBON = "#b8475a";

function material(color: string, roughness = 0.6, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** A red collar with a little gold bell, nothing more: no leash, no reins. */
function harnessFor(cat: CatModel, made: THREE.Material[]) {
  const ribbon = material(RIBBON, 0.55);
  const gold = material(BELL, 0.3, 0.7);
  made.push(ribbon, gold);
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.018, 8, 36),
    ribbon,
  );
  collar.rotation.x = Math.PI / 2 + 0.3;
  collar.position.y = -0.02;
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), gold);
  const swing = new THREE.Group();
  swing.position.set(0, -0.07, 0.15);
  bell.position.y = -0.04;
  swing.add(bell);
  cat.harness.add(collar, swing);
  return swing;
}

/**
 * The sleigh: a coffee cup on golden runners, green band and all, with a
 * cushion inside where Luna rests with her kittens. Model units, facing +z like the cats.
 */
function buildSleigh(made: THREE.Material[]) {
  const sleigh = new THREE.Group();
  const cream = material("#f4ece0", 0.5);
  const band = material("#2f6b4a", 0.55);
  const coffee = material("#5a3a2a", 0.35);
  const gold = material(BELL, 0.3, 0.7);
  const ribbon = material(RIBBON, 0.55);
  made.push(cream, band, coffee, gold, ribbon);

  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.34, 0.55, 40, 1, true),
    cream,
  );
  cup.material.side = THREE.DoubleSide;
  cup.position.y = 0.47;
  cup.scale.z = 1.35;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), cream);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.2;
  bottom.scale.y = 1.35;
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43, 0.395, 0.16, 40, 1, true),
    band,
  );
  sleeve.position.y = 0.45;
  sleeve.scale.set(1.03, 1, 1.38);
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.44, 40), coffee);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.66;
  top.scale.y = 1.35;
  sleigh.add(cup, bottom, sleeve, top);

  // two runners curling up at the front, and the posts holding the cup
  for (const side of [-1, 1]) {
    const path = new THREE.CatmullRomCurve3(
      [
        [-0.62, 0.12],
        [-0.55, 0.02],
        [-0.2, 0],
        [0.45, 0],
        [0.72, 0.1],
        [0.78, 0.3],
        [0.66, 0.38],
      ].map(([z, y]) => new THREE.Vector3(0.3 * side, y!, z!)),
    );
    sleigh.add(
      new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.025, 8), gold),
    );
    for (const z of [-0.3, 0.3]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8),
        gold,
      );
      post.position.set(0.27 * side, 0.11, z);
      sleigh.add(post);
    }
  }
  // a bow on the back
  const bow = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.05, 0.02, 40, 8),
    ribbon,
  );
  bow.position.set(0, 0.5, -0.62);
  sleigh.add(bow);

  // a cushion to lie on
  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 32, 16),
    material("#c98a8f", 0.85),
  );
  made.push(cushion.material);
  cushion.scale.set(0.95, 0.22, 1.25);
  cushion.position.y = 0.62;
  sleigh.add(cushion);

  // Luna, a mama cat soon, lying comfortably along the cup
  const look = (id: string) => SHOP_CATS.find((c) => c.id === id)!.look;
  const luna = buildCat(look(SLEIGH_RIDER), "lie", 77);
  luna.root.scale.setScalar(0.6);
  luna.root.rotation.y = -Math.PI / 2;
  luna.root.position.set(0, 0.62, -0.08);
  sleigh.add(luna.root);
  // and her kittens, peeking over the rim
  const kittens = KITTEN_COATS.map((id, i) => {
    const kitten = buildCat(look(id), "sit", 90 + i);
    // one at the front rim, one at the back, one cuddled against Luna
    kitten.root.scale.setScalar(0.42);
    kitten.root.position.set(0, [0.6, 0.6, 0.7][i]!, [0.46, -0.5, 0.12][i]!);
    sleigh.add(kitten.root);
    return kitten;
  });
  return { sleigh, riders: [luna, ...kittens] };
}

/** A soft round shadow, drawn once on a canvas. */
function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, "rgba(40,28,20,0.45)");
    gradient.addColorStop(1, "rgba(40,28,20,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * The footer's cat parade (FR-099, ADR-032): the walking cats in single
 * file. In the holiday season (`festive`) they wear collars with bells and
 * walk ahead of a cosy coffee-cup sleigh that glides along on its own with
 * Luna and her kittens (nobody is tied to anything); the rest
 * of the year they just stroll, free, with room between them. One
 * transparent canvas the size of the strip, with an orthographic camera in
 * CSS pixels. Each cat steps with its own walk cycle; the parade only draws
 * while the strip is in view and the tab is showing.
 */
export function createParadeStage(
  canvas: HTMLCanvasElement,
  walkers: readonly ShopCat[],
  state: ParadeState,
  still: boolean,
  festive: boolean,
): ParadeStage {
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
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -4000, 4000);
  camera.position.z = 1000;
  scene.add(new THREE.HemisphereLight("#fff4e4", "#6b5a4a", 1.6));
  const key = new THREE.DirectionalLight("#fff1dc", 2.2);
  key.position.set(-0.6, 1, 0.9);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#cfe3ff", 1.1);
  rim.position.set(0.8, 0.4, -1);
  scene.add(rim);

  const made: THREE.Material[] = [];
  const cats = walkers.map((cat, i) => buildCat(cat.look, "walk", i * 13 + 5));
  // the holiday look: collars with bells, and the sleigh gliding behind
  const bells = festive ? cats.map((cat) => harnessFor(cat, made)) : [];
  const { sleigh, riders } = buildSleigh(made);
  if (festive) scene.add(sleigh);
  for (const cat of cats) scene.add(cat.root);

  const shadowMap = shadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
  });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  const shadows = [...cats.map((c) => c.root), sleigh].map((_, i) => {
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.renderOrder = -1;
    if (festive || i < cats.length) scene.add(shadow);
    return shadow;
  });

  // measure a cat and the sleigh walking right, seen a little from the front
  const turn = (dir: 1 | -1) =>
    new THREE.Euler(0.14, dir * (Math.PI / 2 - 0.42), 0);
  for (const cat of cats) cat.update(0, 0, { x: 0, y: 0 }, 0);
  const measure = (object: THREE.Object3D) => {
    object.rotation.copy(turn(1));
    object.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  };
  const catSize = measure(cats[0]!.root);
  const sleighSize = measure(sleigh);

  let width = 0;
  let height = 0;
  let scale = 1;
  let catLength = 0;
  let gap = 0;
  let sleighLength = 0;
  let dirty = true;
  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.left = 0;
    camera.right = width;
    camera.top = height;
    camera.bottom = 0;
    camera.updateProjectionMatrix();
    // the cats stand most of the strip's height, but the whole parade fits
    // the screen at the stop; they walk with room between them, and the
    // sleigh follows a little way behind, tied to no one
    const spacing = festive ? 0.3 : 0.45;
    const units = festive
      ? cats.length * catSize.x * (1 + spacing) +
        catSize.x * spacing * 2 +
        sleighSize.x
      : cats.length * catSize.x + (cats.length - 1) * catSize.x * spacing;
    scale = Math.min((height * 0.82) / catSize.y, (width * 0.94) / units);
    catLength = catSize.x * scale;
    gap = catLength * spacing;
    sleighLength = festive ? sleighSize.x * scale : 0;
    dirty = true;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let visible = true;
  const look = { x: 0, y: 0 };

  const frame = (dt: number, time: number) => {
    if (!visible || width === 0) return;
    if (still && !dirty) return;
    dirty = false;
    const dir = state.dir;
    const ground = height * 0.08;
    const rotation = turn(dir);
    // the lead's nose is at state.x; everyone follows behind it
    let back = state.x - dir * catLength * 0.5;
    const place = (object: THREE.Object3D, length: number, i: number) => {
      object.rotation.copy(rotation);
      object.scale.setScalar(scale);
      object.position.set(back, ground, i);
      const shadow = shadows[i]!;
      shadow.position.set(back, ground + 1, -900);
      shadow.scale.set(length * 0.9, height * 0.07, 1);
    };
    cats.forEach((cat, i) => {
      if (i > 0) back -= dir * (catLength + gap);
      place(cat.root, catLength, i);
      // the cats look out at the visitor at the stop
      look.x = -dir * state.look;
      look.y = -0.15 * state.look;
      cat.update(dt, time, look, still ? 0 : state.stride);
      // the bell swings with the step
      if (bells[i])
        bells[i].rotation.x = Math.sin(time * 9 + i) * 0.4 * state.stride;
    });
    if (!festive) {
      renderer.render(scene, camera);
      return;
    }
    back -= dir * (catLength * 0.5 + gap * 3 + sleighLength * 0.5);
    place(sleigh, sleighLength, cats.length);
    // the sleigh glides with a little sway
    sleigh.position.y +=
      Math.abs(Math.sin(time * 3.4)) * height * 0.012 * state.stride;
    // Luna rests; the kittens look out with the others at the stop
    riders.forEach((rider, i) =>
      rider.update(dt, time, i === 0 ? { x: 0, y: 0 } : look),
    );

    renderer.render(scene, camera);
  };

  const stop = addFrame(frame);

  return {
    span: () =>
      cats.length * catLength +
      (cats.length - 1) * gap +
      (festive ? gap * 3 + sleighLength : 0),
    meow(index) {
      cats[index]?.meow();
      dirty = true;
    },
    draw() {
      dirty = true;
      frame(0, 0);
    },
    setVisible(next) {
      visible = next;
      dirty = true;
    },
    dispose() {
      stop();
      observer.disconnect();
      for (const cat of cats) cat.dispose();
      for (const rider of riders) rider.dispose();
      sleigh.traverse((object) => (object as THREE.Mesh).geometry?.dispose());
      for (const m of made) m.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      shadowMap.dispose();
      disposeCatMaterials();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
