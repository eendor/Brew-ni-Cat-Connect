import * as THREE from "three";

import {
  disposeScene,
  makeRenderer,
  optimizedSrc,
  photoTexture,
  warmUp,
} from "../engine/renderer";
import { damp, type Quality } from "../engine/runtime";

export type RingPhoto = Readonly<{ src: string; alt: string }>;

/**
 * Curved, draggable ring of the real gallery photos. The camera sits inside
 * the ring; the photo facing it is in full color, the rest fall back into
 * the dark. Frames are only drawn while something changes.
 */
export async function initGalleryRing(
  canvas: HTMLCanvasElement,
  photos: readonly RingPhoto[],
  quality: Quality,
  onFocus: (index: number) => void,
) {
  const renderer = makeRenderer(canvas, quality);
  renderer.setClearColor("#0B0A0D", 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  const N = photos.length;
  const seg = (Math.PI * 2) / N;
  const span = seg * 0.84;
  // radius that keeps each print about 2.9 units wide, never tighter than 8
  const R = Math.max(8, 2.9 / span);
  const W = R * span;
  const H = W / 0.75;
  const ring = new THREE.Group();
  scene.add(ring);

  const materials: THREE.ShaderMaterial[] = [];
  const blank = new THREE.DataTexture(new Uint8Array([21, 19, 26, 255]), 1, 1);
  blank.needsUpdate = true;

  const vertexShader = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const fragmentShader = /* glsl */ `
    uniform sampler2D uMap; uniform float uFocus, uAspect; uniform vec2 uSize; varying vec2 vUv;
    float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main(){
      vec2 uv = vec2(1.0 - vUv.x, vUv.y);
      // cover-fit the photo into the 3:4 panel
      float panel = uSize.x / uSize.y;
      if (uAspect > panel) { uv.x = (uv.x - 0.5) * panel / uAspect + 0.5; }
      else { uv.y = (uv.y - 0.5) * uAspect / panel + 0.5; }
      vec2 p = (vUv - 0.5) * uSize;
      float d = sdRound(p, uSize * 0.5, 0.18);
      float mask = 1.0 - smoothstep(-0.015, 0.015, d);
      vec3 col = texture2D(uMap, uv).rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l) * 0.6, col, 0.25 + 0.75 * uFocus) * mix(0.12, 1.0, uFocus * uFocus);
      // soft studio sheen across the print
      col += vec3(1.0) * 0.05 * uFocus * smoothstep(0.2, 0.9, vUv.y) * (1.0 - vUv.x);
      gl_FragColor = vec4(col, mask);
      #include <colorspace_fragment>
    }`;

  const make = (i: number) => {
    const geometry = new THREE.CylinderGeometry(
      R,
      R,
      H,
      24,
      1,
      true,
      Math.PI + i * seg - span / 2,
      span,
    );
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap: { value: blank },
        uFocus: { value: 0 },
        uAspect: { value: 0.75 },
        uSize: { value: new THREE.Vector2(W, H) },
      },
      vertexShader,
      fragmentShader,
    });
    ring.add(new THREE.Mesh(geometry, material));
    return material;
  };
  for (let i = 0; i < N; i++) materials.push(make(i));

  // set when anything on screen changes; the frame skips drawing otherwise
  let dirty = true;
  let disposed = false;
  // textures stream in nearest-first so the front of the ring appears fast,
  // and stop as soon as the ring is torn down
  const order = [...photos.keys()].sort(
    (x, y) => Math.min(x, N - x) - Math.min(y, N - y),
  );
  void (async () => {
    for (const i of order) {
      const photo = photos[i];
      const material = materials[i];
      if (!photo || !material) continue;
      try {
        const texture = await photoTexture(optimizedSrc(photo.src, 640));
        if (disposed) {
          texture.dispose();
          return;
        }
        const image = texture.image as HTMLImageElement;
        material.uniforms.uMap!.value = texture;
        material.uniforms.uAspect!.value = image.width / image.height;
        dirty = true;
      } catch {
        if (disposed) return;
        // leave the dark placeholder panel
      }
    }
  })();

  let width = 1;
  let height = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const narrow = camera.aspect < 0.9;
    camera.fov = narrow ? 58 : 46;
    const distance = narrow ? 6.2 : 7.4;
    camera.position.set(0, 0, -R + distance);
    camera.lookAt(0, 0, -R);
    camera.updateProjectionMatrix();
    dirty = true;
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const st = {
    rot: 0,
    vel: 0,
    target: 0,
    dragging: false,
    lastX: 0,
    scrollOff: 0,
    focus: -1,
  };
  const onDown = (e: PointerEvent) => {
    st.dragging = true;
    st.lastX = e.clientX;
    st.vel = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.dataset.grabbing = "true";
  };
  const onMove = (e: PointerEvent) => {
    if (!st.dragging) return;
    const dx = e.clientX - st.lastX;
    st.lastX = e.clientX;
    const k = ((quality.mobile ? 1.6 : 1.1) * (seg * 4)) / width;
    st.rot -= dx * k;
    st.vel = -dx * k * 60;
  };
  const onUp = () => {
    if (!st.dragging) return;
    st.dragging = false;
    delete canvas.dataset.grabbing;
    st.target = Math.round((st.rot + st.vel * 0.25) / seg) * seg;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const go = (direction: number) => {
    st.target = Math.round(st.rot / seg) * seg + direction * seg;
    dirty = true;
  };
  const goTo = (index: number) => {
    const current = Math.round(st.rot / seg);
    const wrapped = ((current % N) + N) % N;
    let delta = index - wrapped;
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    st.target = (current + delta) * seg;
    dirty = true;
  };

  let lastTotal = Number.NaN;
  function frame(dt: number, scrollProgress: number) {
    if (!st.dragging) st.rot = damp(st.rot, st.target, 4, dt);
    st.scrollOff = damp(
      st.scrollOff,
      (scrollProgress - 0.5) * seg * 0.8,
      6,
      dt,
    );
    const total = st.rot + st.scrollOff;
    // nothing moved and no new photo arrived: keep the last frame
    if (!dirty && !st.dragging && Math.abs(total - lastTotal) < 1e-5) return;
    dirty = false;
    lastTotal = total;
    ring.rotation.y = -total;
    let best = 0;
    let bestValue = -1;
    for (let i = 0; i < N; i++) {
      let angle = i * seg - total;
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      const focus = Math.max(0, 1 - Math.abs(angle) / (seg * 1.1));
      const material = materials[i];
      if (material) material.uniforms.uFocus!.value = focus;
      if (focus > bestValue) {
        bestValue = focus;
        best = i;
      }
    }
    if (best !== st.focus) {
      st.focus = best;
      onFocus(best);
    }
    renderer.render(scene, camera);
  }

  // shaders compile off the main thread and have their first draw now,
  // before the scene is shown, not in the frames scrolled past it
  await renderer.compileAsync(scene, camera);
  warmUp(renderer, scene, () => renderer.render(scene, camera));

  return {
    frame,
    go,
    goTo,
    dispose() {
      disposed = true;
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      disposeScene(scene, renderer);
    },
  };
}
