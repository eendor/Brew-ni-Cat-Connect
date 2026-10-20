import * as THREE from "three";

import { makePost } from "../engine/post";
import {
  disposeScene,
  makeRenderer,
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
import { makeBackdrop } from "./showcase";

const CAMERA_Z = 11;
/** The camera always shows at least this half-frame at the model (4:3). */
const FRAME_HALF_W = 4.27;
const FRAME_HALF_H = 3.2;
/** Largest model height and width inside that frame. */
const MAX_H = 3.7;
const MAX_W = 5;
/** Radians per dragged pixel. */
const DRAG_SPEED = 0.011;
/** How fast a thrown spin slows down, per second. */
const INERTIA = 2.6;
/** Idle turntable speed (rad/s), resumed this many seconds after a drag. */
const AUTO_SPIN = 0.42;
const IDLE_AFTER = 2.2;
/** Seconds a new model takes to settle into place. */
const POP = 0.4;

type Shown = {
  key: string;
  holder: THREE.Group;
  scale: number;
  spin: ReadonlyArray<Readonly<{ target: THREE.Object3D; base: number }>>;
  update: ModelUpdate | undefined;
  pop: number;
};

export type MenuViewer = Awaited<ReturnType<typeof initMenuViewer>>;

/** Cups and ice stay out of the shadow pass: clear things cast no block. */
function castShadows(model: THREE.Object3D) {
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const material = mesh.material as THREE.MeshPhysicalMaterial;
    if (material.transparent || (material.transmission ?? 0) > 0) return;
    mesh.castShadow = true;
  });
}

/**
 * The Menu's 3D viewer: one studio scene (the showcase rig) that shows a
 * single menu item at a time. Guests drag to spin it; it keeps turning
 * slowly on its own when left alone. `show` swaps in another item, size or
 * flavor, compiling its shaders first so the swap never stalls a frame.
 */
export async function initMenuViewer(
  canvas: HTMLCanvasElement,
  quality: Quality,
  spec: ModelSpec,
) {
  const renderer = makeRenderer(canvas, quality, { shadows: true });
  renderer.transmissionResolutionScale = quality.mobile ? 0.5 : 1;
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 4 / 3, 0.1, 100);
  camera.position.set(0, 0.2, CAMERA_Z);

  // the showcase's back wall, without a title: the dialog names the item
  const { mesh: backdrop, material: backdropMaterial } = makeBackdrop();
  const uniforms = backdropMaterial.uniforms;
  uniforms.uReveal!.value = 0;
  uniforms.uGlowStr!.value = 0.9;
  scene.add(backdrop);

  // studio rig: a large soft key, a fill and two colored rim lights
  const key = new THREE.DirectionalLight("#fff4e6", 2.4);
  key.position.set(3.5, 6, 6);
  key.castShadow = true;
  const shadowSize = quality.mobile ? 512 : 1024;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#dfe6ff", 0.35);
  fill.position.set(-6, 2, 4);
  scene.add(fill);
  const rimLeft = new THREE.SpotLight("#7CFF6B", 70, 18, 0.5, 0.9, 2);
  rimLeft.position.set(-3.4, 2.4, -3.2);
  const rimRight = new THREE.SpotLight("#7CFF6B", 55, 18, 0.5, 0.9, 2);
  rimRight.position.set(3.4, 1.6, -3.4);
  scene.add(rimLeft, rimRight, rimLeft.target, rimRight.target);

  // soft shadow catcher plus a contact blob sized to each model
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 7),
    new THREE.ShadowMaterial({ opacity: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  scene.add(floor, contact);

  const post = makePost(renderer, scene, camera, quality, {
    focus: CAMERA_Z,
  });
  const budget = new FrameBudget(
    42,
    () => {
      post.degrade();
      renderer.setPixelRatio(1);
      key.castShadow = false;
      resize();
    },
    quality.forceHigh,
  );

  const center = new THREE.Vector3();
  function resize() {
    const rect = canvas.parentElement?.getBoundingClientRect();
    const width = Math.max(1, rect?.width ?? 1);
    const height = Math.max(1, rect?.height ?? 1);
    renderer.setSize(width, height, false);
    post.setSize(width, height);
    camera.aspect = width / height;
    // a narrow stage widens the view instead of cropping the model
    const halfHeight = Math.max(FRAME_HALF_H, FRAME_HALF_W / camera.aspect);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfHeight / CAMERA_Z));
    camera.updateProjectionMatrix();
    const distance = CAMERA_Z + 6;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    backdrop.position.set(0, camera.position.y, -6);
    backdrop.scale.set(h * camera.aspect, h, 1);
    uniforms.uAspect!.value = camera.aspect;
    // the colored spill sits right behind the model
    center.set(0, 0.1, 0).project(camera);
    (uniforms.uCenter!.value as THREE.Vector2).set(
      center.x * 0.5 + 0.5,
      center.y * 0.5 + 0.5,
    );
  }
  resize();
  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  // drag to spin, with a throw that slows down, then the idle turntable
  const spin = { angle: 0, velocity: 0, idleSince: -Infinity, time: 0 };
  const drag = { id: -1, x: 0, at: 0 };
  const onDown = (event: PointerEvent) => {
    if (drag.id !== -1 || event.button !== 0) return;
    drag.id = event.pointerId;
    drag.x = event.clientX;
    drag.at = event.timeStamp;
    spin.velocity = 0;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== drag.id) return;
    const turn = (event.clientX - drag.x) * DRAG_SPEED;
    const seconds = Math.max(0.008, (event.timeStamp - drag.at) / 1000);
    drag.x = event.clientX;
    drag.at = event.timeStamp;
    spin.angle += turn;
    spin.velocity = THREE.MathUtils.clamp(
      spin.velocity * 0.5 + (turn / seconds) * 0.5,
      -14,
      14,
    );
  };
  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== drag.id) return;
    // a drag that stopped before letting go doesn't throw
    if (event.timeStamp - drag.at > 90) spin.velocity = 0;
    drag.id = -1;
    spin.idleSince = spin.time;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    canvas.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  let current: Shown | null = null;
  let wanted = "";
  let ticket = 0;
  let disposed = false;
  const glow = new THREE.Color(spec.glow);
  const glowTarget = glow.clone();

  async function load(next: ModelSpec, mine: number) {
    const model = await buildModel(next, quality.mobile);
    if (disposed || mine !== ticket) {
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
    castShadows(model);
    const holder = new THREE.Group();
    holder.add(model);
    holder.visible = false;
    scene.add(holder);
    try {
      await post.precompile();
    } catch (error) {
      disposeModel(holder);
      throw error;
    }
    if (disposed || mine !== ticket) {
      disposeModel(holder);
      return;
    }
    // every size of an item stands on the same floor, so a small one
    // looks small next to where the large one stood
    const floorY = (-scale * fit.y) / 2;
    holder.position.y = floorY;
    holder.scale.setScalar(scale * 0.9);
    holder.visible = true;
    floor.position.y = floorY;
    contact.position.y = floorY + 0.01;
    contact.scale.set(scale * size.x * 1.1, scale * size.z * 1.1, 1);
    if (current) disposeModel(current.holder);
    current = {
      key: next.key,
      holder,
      scale,
      spin: spinTargets(model).map((target) => ({
        target,
        base: target.rotation.y,
      })),
      update: model.userData.update as ModelUpdate | undefined,
      pop: 0,
    };
    // names the model on screen (the browser tests wait on it)
    canvas.dataset.model = next.key;
    glowTarget.set(next.glow);
  }

  /** Shows another model; resolves once it is on screen (or replaced). */
  function show(next: ModelSpec): Promise<void> {
    if (next.key === wanted) return Promise.resolve();
    wanted = next.key;
    // a newer pick cancels any model still building
    const mine = ++ticket;
    if (current?.key === next.key) {
      glowTarget.set(next.glow);
      return Promise.resolve();
    }
    return load(next, mine);
  }

  function frame(dt: number, time: number) {
    budget.push(dt * 1000);
    spin.time = time;
    if (drag.id === -1) {
      spin.velocity =
        time - spin.idleSince > IDLE_AFTER
          ? damp(spin.velocity, AUTO_SPIN, 1.5, dt)
          : spin.velocity * Math.exp(-INERTIA * dt);
      spin.angle += spin.velocity * dt;
    }
    if (current) {
      for (const { target, base } of current.spin) {
        target.rotation.y = base + spin.angle;
      }
      current.pop = Math.min(1, current.pop + dt / POP);
      const settle = 1 - (1 - current.pop) ** 3;
      current.holder.scale.setScalar(current.scale * (0.9 + 0.1 * settle));
      current.update?.(dt, time);
    }
    glow.lerp(glowTarget, 1 - Math.exp(-4 * dt));
    (uniforms.uGlow!.value as THREE.Color).copy(glow);
    rimLeft.color.copy(glow);
    rimRight.color.copy(glow);
    post.render(dt, time);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    observer.disconnect();
    post.dispose();
    if (current) disposeModel(current.holder);
    current = null;
    disposeScene(scene, renderer);
  }

  // the first model is ready before the viewer reports itself ready
  try {
    await show(spec);
  } catch (error) {
    dispose();
    throw error;
  }
  return { frame, show, dispose };
}
