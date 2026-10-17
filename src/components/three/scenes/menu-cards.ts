import gsap from "gsap";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import {
  disposeScene,
  makeRenderer,
  photoTexture,
  studioEnvironment,
} from "../engine/renderer";
import { damp, pointer, type Quality } from "../engine/runtime";

/**
 * Menu photo tiles in 3D. Every `[data-three-tile]` element (the photo slot
 * on a real menu card) gets a glossy photo print with real thickness that
 * flips in when it scrolls into view, tilts toward the cursor and catches a
 * coloured rim light. The DOM photo stays in place (with its alt text) and
 * is only hidden visually once its 3D tile is ready.
 */

type Tile = {
  el: HTMLElement;
  card: HTMLElement | null;
  group: THREE.Group;
  photo: THREE.Mesh;
  body: THREE.Mesh;
  halo: THREE.Mesh;
  sheen: THREE.Mesh;
  texture: THREE.Texture;
  /** cover-fit repeat for the photo before the parallax zoom */
  cover: THREE.Vector2;
  s: {
    fly: number;
    spin: number;
    hover: number;
    tx: number;
    ty: number;
    seen: boolean;
  };
};

function roundedMask(radius = 0.16) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d");
  if (g) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#fff";
    g.beginPath();
    g.roundRect(2, 2, 252, 252, radius * 256);
    g.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function haloTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d");
  if (g) {
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Diagonal specular streak used as the rim-light sheen on hover. */
function sheenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 32;
  const g = canvas.getContext("2d");
  if (g) {
    const gradient = g.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, "rgba(255,255,255,1)");
    gradient.addColorStop(0.58, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 256, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.center.set(0.5, 0.5);
  texture.rotation = -0.5;
  return texture;
}

/** Photo zoom inside the print, leaving room for the scroll parallax. */
const ZOOM = 0.84;

export async function initMenuCards(
  canvas: HTMLCanvasElement,
  quality: Quality,
) {
  const renderer = makeRenderer(canvas, quality, { alpha: true });
  renderer.setClearColor(0x000000, 0);
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.8;
  const camera = new THREE.PerspectiveCamera(45, 1, 10, 8000);
  camera.position.z = 1200;
  const key = new THREE.DirectionalLight("#fff3e4", 1.6);
  key.position.set(300, 700, 900);
  scene.add(key);

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

  const mask = roundedMask();
  const halo = haloTexture();
  const streak = sheenTexture();
  const bodyGeometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.12);
  const plane = new THREE.PlaneGeometry(1, 1);
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: "#17151c",
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    metalness: 0.1,
  });
  const tiles = new Map<HTMLElement, Tile>();
  let entryQueue = 0;

  async function addTile(el: HTMLElement) {
    const src = el.dataset.threeTile;
    if (!src) return;
    const glow = el.dataset.glow ?? "#FFB547";
    const group = new THREE.Group();
    const texture = await photoTexture(src, 8);
    // object-fit: cover for the square print, then zoomed for parallax
    const image = texture.image as { width: number; height: number };
    const aspect = image.width / Math.max(1, image.height);
    const cover = new THREE.Vector2(
      aspect > 1 ? 1 / aspect : 1,
      aspect > 1 ? 1 : aspect,
    );
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    const photo = new THREE.Mesh(
      plane,
      new THREE.MeshPhysicalMaterial({
        map: texture,
        alphaMap: mask,
        transparent: true,
        roughness: 0.42,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 0.55,
      }),
    );
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    const glowMesh = new THREE.Mesh(
      plane,
      new THREE.MeshBasicMaterial({
        map: halo,
        color: glow,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const sheen = new THREE.Mesh(
      plane,
      new THREE.MeshBasicMaterial({
        map: streak.clone(),
        alphaMap: mask,
        color: glow,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(glowMesh, body, photo, sheen);
    scene.add(group);
    const tile: Tile = {
      el,
      card: el.closest<HTMLElement>(".menu-card"),
      group,
      photo,
      body,
      halo: glowMesh,
      sheen,
      texture,
      cover,
      s: { fly: 0, spin: 0, hover: 0, tx: 0, ty: 0, seen: false },
    };
    tiles.set(el, tile);
    el.dataset.threeReady = "true";
  }

  function removeTile(tile: Tile) {
    scene.remove(tile.group);
    (tile.photo.material as THREE.MeshPhysicalMaterial).map?.dispose();
    (tile.photo.material as THREE.Material).dispose();
    (tile.halo.material as THREE.Material).dispose();
    (tile.sheen.material as THREE.MeshBasicMaterial).map?.dispose();
    (tile.sheen.material as THREE.Material).dispose();
    delete tile.el.dataset.threeReady;
    if (tile.card) tile.card.style.transform = "";
    tiles.delete(tile.el);
  }

  const pending = new Set<HTMLElement>();
  function sync() {
    const present = new Set(
      document.querySelectorAll<HTMLElement>("[data-three-tile]"),
    );
    for (const el of present) {
      if (!tiles.has(el) && !pending.has(el)) {
        pending.add(el);
        void addTile(el).finally(() => pending.delete(el));
      }
    }
    for (const [el, tile] of tiles) if (!present.has(el)) removeTile(tile);
  }
  sync();
  const mutation = new MutationObserver(() => sync());
  mutation.observe(document.body, { childList: true, subtree: true });

  // a click on a card's order button spins its tile once
  const onClick = (event: MouseEvent) => {
    const button = (event.target as HTMLElement | null)?.closest(
      "[data-order-trigger]",
    );
    const card = button?.closest(".menu-card");
    if (!card) return;
    for (const tile of tiles.values()) {
      if (tile.card === card) {
        gsap.fromTo(
          tile.s,
          { spin: 0 },
          { spin: Math.PI * 2, duration: 1.1, ease: "power3.inOut" },
        );
      }
    }
  };
  document.addEventListener("click", onClick);

  const tmp = new THREE.Vector3();
  function frame(dt: number) {
    renderer.clear();
    let any = false;
    // tiles stay under the sticky header and category bar
    const header =
      document.querySelector(".site-header")?.getBoundingClientRect().bottom ??
      0;
    const tabs =
      document.querySelector(".menu-tabs")?.getBoundingClientRect().bottom ?? 0;
    const clipTop = Math.max(header, tabs, 0);
    for (const tile of tiles.values()) {
      const r = tile.el.getBoundingClientRect();
      const on = r.width > 0 && r.bottom > clipTop - 40 && r.top < vh + 80;
      if (!on) {
        tile.group.visible = false;
        continue;
      }
      any = true;
      if (!tile.s.seen && r.top < vh * 0.92) {
        tile.s.seen = true;
        const column = r.left + r.width / 2 > vw / 2 ? 1 : 0;
        gsap.to(tile.s, {
          fly: 1,
          duration: 1.4,
          ease: "expo.out",
          delay: (entryQueue++ % 6) * 0.08 + column * 0.12,
        });
        gsap.delayedCall(0.6, () => (entryQueue = Math.max(0, entryQueue - 1)));
      }
      const cr = tile.card?.getBoundingClientRect() ?? r;
      const inside =
        !quality.mobile &&
        pointer.px > cr.left &&
        pointer.px < cr.right &&
        pointer.py > cr.top &&
        pointer.py < cr.bottom;
      tile.s.hover = damp(tile.s.hover, inside ? 1 : 0, 8, dt);
      tile.s.tx = damp(
        tile.s.tx,
        inside ? ((pointer.px - cr.left) / cr.width - 0.5) * 2 : 0,
        7,
        dt,
      );
      tile.s.ty = damp(
        tile.s.ty,
        inside ? ((pointer.py - cr.top) / cr.height - 0.5) * 2 : 0,
        7,
        dt,
      );
      if (tile.card) {
        const rx = (-tile.s.ty * 3.5).toFixed(2);
        const ry = (tile.s.tx * 4.5).toFixed(2);
        tile.card.style.transform =
          tile.s.hover > 0.01
            ? `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`
            : "";
      }
      const f = tile.s.fly;
      const inv = 1 - f;
      // a tile waits off stage until its entrance starts, instead of showing
      // its dark back deep in the scene
      tile.group.visible = f > 0.001;
      tmp.set(
        r.left + r.width / 2 - vw / 2,
        vh / 2 - (r.top + r.height / 2),
        0,
      );
      tile.group.position.set(
        tmp.x,
        tmp.y - inv * 60,
        -inv * 1300 + tile.s.hover * 30,
      );
      tile.group.rotation.set(
        -inv * 0.9 + tile.s.ty * 0.35,
        inv * -Math.PI + tile.s.spin + tile.s.tx * 0.45,
        inv * -0.12,
      );
      const depth = Math.min(r.width, r.height) * 0.08;
      tile.photo.scale.set(r.width, r.height, 1);
      tile.photo.position.z = depth / 2 + 0.6;
      tile.body.scale.set(r.width * 0.995, r.height * 0.995, depth);
      tile.halo.scale.set(r.width * 2.2, r.height * 2.2, 1);
      tile.halo.position.z = -depth;
      (tile.halo.material as THREE.MeshBasicMaterial).opacity =
        f * (0.12 + 0.4 * tile.s.hover);
      (tile.photo.material as THREE.MeshPhysicalMaterial).opacity = Math.min(
        1,
        f * 1.6,
      );
      // the photo drifts inside its print as the card crosses the screen
      const drift = Math.max(
        -1,
        Math.min(1, (r.top + r.height / 2) / vh - 0.5),
      );
      const rx = tile.cover.x * ZOOM;
      const ry = tile.cover.y * ZOOM;
      tile.texture.repeat.set(rx, ry);
      tile.texture.offset.set(
        (1 - rx) / 2 + tile.s.tx * (1 - rx) * 0.35,
        (1 - ry) / 2 + drift * (1 - ry) * 0.8,
      );
      // rim-light sheen: a glow-tinted streak that slides with the pointer
      tile.sheen.scale.set(r.width, r.height, 1);
      tile.sheen.position.z = depth / 2 + 1.2;
      const sheenMaterial = tile.sheen.material as THREE.MeshBasicMaterial;
      sheenMaterial.map?.offset.set(-tile.s.tx * 0.45, 0);
      (tile.sheen.material as THREE.MeshBasicMaterial).opacity =
        f * tile.s.hover * 0.32;
    }
    if (any) {
      renderer.setScissorTest(true);
      renderer.setScissor(0, 0, vw, Math.max(0, vh - clipTop));
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
    }
  }

  return {
    frame,
    dispose() {
      window.removeEventListener("resize", resize);
      document.removeEventListener("click", onClick);
      mutation.disconnect();
      for (const tile of [...tiles.values()]) removeTile(tile);
      disposeScene(scene, renderer);
    },
  };
}
