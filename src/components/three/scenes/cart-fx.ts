import gsap from "gsap";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import {
  CART_TOSS_EVENT,
  CART_TOSS_MS,
  type CartTossDetail,
} from "../cart-toss";
import {
  canvasTexture,
  disposeScene,
  drawCover,
  loadImage,
  makeRenderer,
  studioEnvironment,
} from "../engine/renderer";
import type { Quality } from "../engine/runtime";

/**
 * Add-to-cart toss. When an item is really added, its photo flies as a
 * glossy token from the dialog's button into the header cart button, and
 * the button gives a short bump as it lands. The full-screen canvas stays
 * hidden and renders nothing between tosses; the cart button keeps its
 * normal icon.
 */

const FACE_SIZE = 256;

function visibleTrigger(): HTMLElement | null {
  const triggers = document.querySelectorAll<HTMLElement>(
    "[data-cart-trigger]",
  );
  for (const element of triggers) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return element;
  }
  return null;
}

/** Restarts the CSS bump on the cart button (see globals.css). */
function bump(trigger: HTMLElement) {
  trigger.removeAttribute("data-bump");
  void trigger.offsetWidth;
  trigger.setAttribute("data-bump", "");
  trigger.addEventListener(
    "animationend",
    () => trigger.removeAttribute("data-bump"),
    { once: true },
  );
}

export async function initCartFx(canvas: HTMLCanvasElement, quality: Quality) {
  const renderer = makeRenderer(
    canvas,
    { ...quality, maxDpr: Math.min(quality.maxDpr, 1.5) },
    { alpha: true },
  );
  renderer.setClearColor(0x000000, 0);
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(45, 1, 10, 8000);
  camera.position.z = 1200;
  const key = new THREE.DirectionalLight("#fff3e4", 2);
  key.position.set(200, 600, 900);
  const rim = new THREE.PointLight("#7CFF6B", 4, 0, 0);
  scene.add(key, rim);

  let vw = 1;
  let vh = 1;
  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(vh / 2 / camera.position.z),
    );
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  const toWorld = (x: number, y: number, out: THREE.Vector3, z = 0) =>
    out.set(x - vw / 2, vh / 2 - y, z);

  // one face texture, repainted per toss, so a toss never recompiles shaders
  const face = document.createElement("canvas");
  face.width = face.height = FACE_SIZE;
  const faceTexture = canvasTexture(face);
  function paintFace(glow: string, photo?: HTMLImageElement) {
    const g = face.getContext("2d");
    if (!g) return;
    g.fillStyle = glow;
    g.fillRect(0, 0, FACE_SIZE, FACE_SIZE);
    if (photo) drawCover(g, photo, 0, 0, FACE_SIZE, FACE_SIZE, 0.5);
    faceTexture.needsUpdate = true;
  }
  paintFace("#7CFF6B");
  const token = new THREE.Mesh(
    new RoundedBoxGeometry(44, 44, 6, 3, 2),
    new THREE.MeshPhysicalMaterial({
      map: faceTexture,
      roughness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  );
  scene.add(token);
  renderer.compile(scene, camera);
  canvas.style.visibility = "hidden";

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let flight: gsap.core.Tween | null = null;
  let tossId = 0;

  function toss(detail: CartTossDetail) {
    const trigger = visibleTrigger();
    if (!trigger) return;
    const target = trigger.getBoundingClientRect();
    toWorld(
      detail.from.x + detail.from.width / 2,
      detail.from.y + detail.from.height / 2,
      a,
      40,
    );
    toWorld(
      target.left + target.width / 2,
      target.top + target.height / 2,
      c,
      0,
    );
    b.set((a.x + c.x) / 2 - 120, Math.max(a.y, c.y) + 240, 420);
    rim.color.set(detail.glow);
    rim.position.set(c.x, c.y, -120);

    // fly straight away on the item color; the photo lands on the face
    // as soon as it has loaded
    const id = ++tossId;
    paintFace(detail.glow);
    if (detail.photo) {
      loadImage(detail.photo)
        .then((photo) => {
          if (id === tossId) paintFace(detail.glow, photo);
        })
        .catch(() => {
          // keep the plain color face
        });
    }

    flight?.kill();
    canvas.style.visibility = "visible";
    const o = { t: 0 };
    flight = gsap.to(o, {
      t: 1,
      // short but readable: the drawer opens as soon as it lands
      duration: CART_TOSS_MS / 1000,
      ease: "power2.inOut",
      onUpdate() {
        const t = o.t;
        const it = 1 - t;
        token.position.set(
          it * it * a.x + 2 * it * t * b.x + t * t * c.x,
          it * it * a.y + 2 * it * t * b.y + t * t * c.y,
          it * it * a.z + 2 * it * t * b.z + t * t * c.z,
        );
        token.rotation.set(t * 5, t * 2.2, t * 3);
        token.scale.setScalar(1.6 - 1.05 * t);
        renderer.render(scene, camera);
      },
      onComplete() {
        flight = null;
        renderer.clear();
        canvas.style.visibility = "hidden";
        bump(trigger);
      },
    });
  }
  const onToss = (event: Event) => {
    toss((event as CustomEvent<CartTossDetail>).detail);
  };
  window.addEventListener(CART_TOSS_EVENT, onToss);

  return {
    dispose() {
      flight?.kill();
      window.removeEventListener("resize", resize);
      window.removeEventListener(CART_TOSS_EVENT, onToss);
      disposeScene(scene, renderer);
    },
  };
}
