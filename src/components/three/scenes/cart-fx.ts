import gsap from "gsap";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import { CART_TOSS_EVENT, type CartTossDetail } from "../cart-toss";
import {
  disposeScene,
  loadImage,
  makeRenderer,
  studioEnvironment,
  drawCover,
  canvasTexture,
} from "../engine/renderer";
import type { Quality } from "../engine/runtime";
import { fbm, normalFromHeight } from "../engine/textures";

/**
 * Site-wide cart layer: a woven basket that sits in the header cart button
 * and receives the item photo tossed from the order dialog when an item is
 * really added to the cart.
 */

function wickerMaps(size = 256) {
  const n = fbm(size, 71, 4, 8);
  const height = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);
  const light = new THREE.Color("#b7874f");
  const dark = new THREE.Color("#5e3d1f");
  const c = new THREE.Color();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = (x / size) * 16;
      const v = (y / size) * 10;
      const row = Math.floor(v);
      const over = (Math.floor(u) + row) % 2 === 0;
      const strand = Math.sin((v % 1) * Math.PI);
      const weave = Math.sin((u % 1) * Math.PI) * (over ? 1 : 0.4);
      const h = strand * 0.6 + weave * 0.4 + (n[i] ?? 0) * 0.15;
      height[i] = h;
      c.copy(dark)
        .lerp(light, Math.min(1, h * 0.9 + (n[i] ?? 0) * 0.2))
        .convertLinearToSRGB();
      albedo[i * 4] = c.r * 255;
      albedo[i * 4 + 1] = c.g * 255;
      albedo[i * 4 + 2] = c.b * 255;
      albedo[i * 4 + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(albedo, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.needsUpdate = true;
  return { map, normalMap: normalFromHeight(height, size, 3) };
}

function makeBasket() {
  const basket = new THREE.Group();
  const maps = wickerMaps();
  const wicker = new THREE.MeshPhysicalMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    roughness: 0.75,
    sheen: 0.4,
    sheenColor: new THREE.Color("#e8c48f"),
    side: THREE.DoubleSide,
  });
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    points.push(
      new THREE.Vector2(
        0.42 + t * 0.2 + Math.sin(t * Math.PI) * 0.03,
        -0.3 + t * 0.6,
      ),
    );
  }
  basket.add(new THREE.Mesh(new THREE.LatheGeometry(points, 48), wicker));
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), wicker);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -0.3;
  basket.add(bottom);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.045, 12, 64),
    wicker,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.3;
  basket.add(rim);
  const arc: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    arc.push(new THREE.Vector3(Math.cos(a) * 0.5, 0.3 + Math.sin(a) * 0.5, 0));
  }
  basket.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(arc),
        48,
        0.04,
        10,
        false,
      ),
      wicker,
    ),
  );
  return basket;
}

async function tokenTexture(photo: string | null, glow: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d");
  if (g) {
    g.fillStyle = glow;
    g.fillRect(0, 0, 256, 256);
    if (photo) {
      try {
        drawCover(g, await loadImage(photo), 0, 0, 256, 256, 0.5);
      } catch {
        // keep the plain colour face
      }
    }
  }
  return canvasTexture(canvas);
}

function visibleTrigger(): HTMLElement | null {
  const triggers = document.querySelectorAll<HTMLElement>(
    "[data-cart-trigger]",
  );
  for (const el of triggers) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
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
  rim.position.set(0, 0, -200);
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

  const basket = makeBasket();
  scene.add(basket);
  const bump = { s: 1, tilt: 0 };

  const token = new THREE.Mesh(
    new RoundedBoxGeometry(44, 44, 6, 3, 2),
    new THREE.MeshPhysicalMaterial({
      roughness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  );
  token.visible = false;
  scene.add(token);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let tossing = false;
  async function toss(detail: CartTossDetail) {
    const trigger = visibleTrigger();
    if (!trigger) return;
    const tr = trigger.getBoundingClientRect();
    toWorld(
      detail.from.x + detail.from.width / 2,
      detail.from.y + detail.from.height / 2,
      a,
      40,
    );
    toWorld(tr.left + tr.width / 2, tr.top + tr.height / 2, c, 0);
    b.set((a.x + c.x) / 2 - 120, Math.max(a.y, c.y) + 240, 420);
    const material = token.material as THREE.MeshPhysicalMaterial;
    material.map?.dispose();
    material.map = await tokenTexture(detail.photo, detail.glow);
    material.needsUpdate = true;
    rim.color.set(detail.glow);
    token.visible = true;
    tossing = true;
    const o = { t: 0 };
    gsap.to(o, {
      t: 1,
      duration: 0.8,
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
        token.scale.setScalar(1.15 - 0.7 * t);
      },
      onComplete() {
        token.visible = false;
        tossing = false;
        gsap.fromTo(
          bump,
          { s: 1.4 },
          { s: 1, duration: 0.9, ease: "elastic.out(1, 0.35)" },
        );
        gsap.fromTo(
          bump,
          { tilt: 0.35 },
          { tilt: 0, duration: 0.9, ease: "elastic.out(1, 0.3)" },
        );
      },
    });
  }
  const onToss = (event: Event) => {
    void toss((event as CustomEvent<CartTossDetail>).detail);
  };
  window.addEventListener(CART_TOSS_EVENT, onToss);
  document.documentElement.classList.add("three-cart");

  const tmp = new THREE.Vector3();
  let lastKey = "";
  function frame(_dt: number, time: number) {
    const trigger = visibleTrigger();
    const drawerOpen = Boolean(
      document.querySelector('[aria-labelledby="cart-drawer-title"]'),
    );
    basket.visible = Boolean(trigger) && !drawerOpen;
    if (trigger) {
      const r = trigger.getBoundingClientRect();
      toWorld(r.left + r.width / 2, r.top + r.height / 2 + 2, tmp);
      basket.position.copy(tmp);
      basket.scale.setScalar(r.width * 0.34 * bump.s);
      rim.position.set(tmp.x, tmp.y, -120);
    }
    basket.rotation.set(0.42, time * 0.5, bump.tilt);
    const keyNow = `${basket.position.x}|${basket.position.y}|${basket.visible}`;
    // skip GPU work when nothing moved and no toss is running
    if (!tossing && keyNow === lastKey && Math.round(time * 30) % 2 === 1)
      return;
    lastKey = keyNow;
    renderer.render(scene, camera);
  }

  return {
    frame,
    dispose() {
      window.removeEventListener("resize", resize);
      window.removeEventListener(CART_TOSS_EVENT, onToss);
      document.documentElement.classList.remove("three-cart");
      disposeScene(scene, renderer);
    },
  };
}
