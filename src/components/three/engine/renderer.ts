import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

import type { Quality } from "./runtime";

export { optimizedSrc } from "./image-src";

/** CC0 studio HDRI from Poly Haven, bundled in /public (see docs). */
export const STUDIO_HDRI = "/three/hdri/studio_small_09_1k.hdr";

export function makeRenderer(
  canvas: HTMLCanvasElement,
  quality: Quality,
  options: { alpha?: boolean; shadows?: boolean } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !quality.mobile,
    alpha: options.alpha ?? false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (options.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  return renderer;
}

let hdrData: Promise<THREE.DataTexture> | null = null;
const envCache = new WeakMap<THREE.WebGLRenderer, Promise<THREE.Texture>>();

/**
 * Prefiltered (PMREM) studio environment for one renderer. The HDR file is
 * downloaded once and shared; each WebGL context gets its own PMREM target.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  let env = envCache.get(renderer);
  if (!env) {
    hdrData ??= new HDRLoader().loadAsync(STUDIO_HDRI);
    env = hdrData.then((source) => {
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
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
