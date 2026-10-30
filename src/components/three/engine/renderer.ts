import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

import type { Quality } from "./runtime";
import { EXPOSURE, TONE_MAPPING } from "./studio";

export { optimizedSrc } from "./image-src";

/** CC0 studio HDRI from Poly Haven, bundled in /public (see docs). */
export const STUDIO_HDRI = "/three/hdri/studio_small_09_1k.hdr";
/** Half-size copy for phones, made with scripts/downsample_hdr.py. */
export const STUDIO_HDRI_SMALL = "/three/hdri/studio_small_09_512.hdr";

/** The renderer living on each canvas, so a failed start can still free it. */
const renderers = new WeakMap<HTMLCanvasElement, THREE.WebGLRenderer>();
const freed = new WeakSet<THREE.WebGLRenderer>();
/** Renderers made for the lite tier; they light scenes with the small HDRI. */
const liteRenderers = new WeakSet<THREE.WebGLRenderer>();

export function makeRenderer(
  canvas: HTMLCanvasElement,
  quality: Quality,
  options: { alpha?: boolean; shadows?: boolean; post?: boolean } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    // a scene drawn through post-processing is antialiased in the effects'
    // own target, so its canvas doesn't multisample on top of that
    antialias: !quality.mobile && !options.post,
    alpha: options.alpha ?? false,
    powerPreference: "high-performance",
  });
  renderers.set(canvas, renderer);
  if (quality.lite) liteRenderers.add(renderer);
  canvas.dataset.tier = quality.lite ? "lite" : "full";
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
  renderer.toneMapping = TONE_MAPPING;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // each shader check is a blocking round trip to the GPU; the three.js docs
  // advise turning them off in production
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
  // asked now, while the GPU is idle: asked first by a texture upload, it
  // waits for every shader still compiling
  renderer.capabilities.getMaxAnisotropy();
  // the lite tier goes without shadows: lights that cast them then cost
  // nothing, and materials compile without the shadow code
  if (options.shadows && !quality.lite) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  return renderer;
}

/**
 * Draws the shadow maps once a frame, or every third frame after
 * `slowDown()`. Left alone, three.js redraws them on every render call, and
 * depth of field renders the scene a second time each frame. Slowing them
 * down keeps the shadows and every material's shader: switching the light's
 * shadow off instead would rebuild those shaders in the middle of the scene.
 */
export function shadowPacer(renderer: Pick<THREE.WebGLRenderer, "shadowMap">) {
  renderer.shadowMap.autoUpdate = false;
  let every = 1;
  let frame = 0;
  return {
    /** Call once a frame, before drawing. */
    beforeFrame() {
      renderer.shadowMap.needsUpdate = frame % every === 0;
      frame += 1;
    },
    slowDown() {
      every = 3;
    },
  };
}

/**
 * Draws a scene once with every hidden or off-screen object included, so
 * each shader's first use (a blocking round trip to the GPU) happens while
 * the scene is still out of sight, not in the frame a product first shows
 * up in. Lights stay as they are: showing one more would rebuild every
 * shader for it.
 */
export function warmUp(
  renderer: Pick<THREE.WebGLRenderer, "shadowMap">,
  scene: THREE.Object3D,
  draw: () => void,
) {
  const shown: THREE.Object3D[] = [];
  const culled: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (!object.visible && !(object as THREE.Light).isLight) {
      object.visible = true;
      shown.push(object);
    }
    if (object.frustumCulled) {
      object.frustumCulled = false;
      culled.push(object);
    }
  });
  if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true;
  try {
    draw();
  } finally {
    shown.forEach((object) => (object.visible = false));
    culled.forEach((object) => (object.frustumCulled = true));
  }
}

/** Disposes a renderer and drops its context, once. */
function freeRenderer(renderer: THREE.WebGLRenderer) {
  if (freed.has(renderer)) return;
  freed.add(renderer);
  const canvas = renderer.domElement;
  if (renderers.get(canvas) === renderer) renderers.delete(canvas);
  renderer.dispose();
  renderer.forceContextLoss();
}

/**
 * Frees the renderer and WebGL context on a canvas, if one is still there.
 * The scene hook calls it on unmount and when a scene fails part-way
 * through starting.
 */
export function releaseRenderer(canvas: HTMLCanvasElement) {
  const renderer = renderers.get(canvas);
  if (renderer) freeRenderer(renderer);
}

const hdrData = new Map<string, Promise<THREE.DataTexture>>();
const envCache = new WeakMap<THREE.WebGLRenderer, Promise<THREE.Texture>>();

/**
 * Prefiltered (PMREM) studio environment for one renderer. Each HDR file is
 * downloaded once and shared; each WebGL context gets its own PMREM target.
 * Phone-tier renderers use the half-size file, a quarter of the download
 * with a smaller PMREM, so every scene on a phone shares that one small copy.
 * A failed download is forgotten so the next scene can try again.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  let env = envCache.get(renderer);
  if (!env) {
    const src = liteRenderers.has(renderer) ? STUDIO_HDRI_SMALL : STUDIO_HDRI;
    let data = hdrData.get(src);
    if (!data) {
      data = new HDRLoader().loadAsync(src).catch((error) => {
        hdrData.delete(src);
        throw error;
      });
      hdrData.set(src, data);
    }
    env = data.then((source) => {
      source.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const target = pmrem.fromEquirectangular(source);
      pmrem.dispose();
      return target.texture;
    });
    envCache.set(renderer, env);
  }
  return env;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string) {
  let promise = imageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    imageCache.set(src, promise);
  }
  return promise;
}

export async function photoTexture(src: string, anisotropy = 4) {
  const image = await loadImage(src);
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function canvasTexture(canvas: HTMLCanvasElement, srgb = true) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function context2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas unavailable");
  return context;
}

/** Draws an image into a box like `object-fit: cover`. */
export function drawCover(
  g: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  focusY = 0.5,
) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  g.drawImage(
    image,
    (image.width - sw) / 2,
    (image.height - sh) * focusY,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

/** Frees GPU memory held by a scene graph and its renderer. */
export function disposeScene(
  scene: THREE.Object3D,
  renderer?: THREE.WebGLRenderer,
) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
  if (renderer) freeRenderer(renderer);
}
