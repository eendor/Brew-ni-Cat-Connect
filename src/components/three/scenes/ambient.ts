import * as THREE from "three";

import { makePost } from "../engine/post";
import {
  disposeScene,
  makeRenderer,
  studioEnvironment,
  warmUp,
} from "../engine/renderer";
import {
  FRAME_BUDGET_MS,
  FrameBudget,
  damp,
  pointer,
  type Quality,
} from "../engine/runtime";
import type { Theme } from "@/lib/theme/theme";

import {
  currentTheme,
  followTheme,
  studioBackground,
  studioCanvas,
  UNTONEMAP_GLSL,
} from "../engine/studio";
import { rng } from "../engine/textures";
import {
  beanGeometry,
  floaterMaterials,
  iceGeometry,
  leafGeometry,
  liteMaterials,
} from "./models";

export type AmbientMood = "about" | "gallery" | "contact" | "cart" | "checkout";

const moods: Record<
  AmbientMood,
  { glow: string; mix: readonly [number, number, number] }
> = {
  // [ice, leaves, beans] proportions
  about: { glow: "#FFB547", mix: [0.25, 0.25, 0.5] },
  gallery: { glow: "#5EE1FF", mix: [0.5, 0.25, 0.25] },
  contact: { glow: "#FFB547", mix: [0.3, 0.2, 0.5] },
  cart: { glow: "#7CFF6B", mix: [0.45, 0.35, 0.2] },
  checkout: { glow: "#FFD93B", mix: [0.4, 0.2, 0.4] },
};

/**
 * Quiet studio backdrop for interior page headers: a few real-looking ice
 * cubes, tea leaves and roasted beans drifting at different depths, rim-lit
 * in the page's color and softened by depth of field. Purely decorative.
 */
export async function initAmbient(
  canvas: HTMLCanvasElement,
  quality: Quality,
  mood: AmbientMood,
) {
  const config = moods[mood];
  // the lite tier (ADR-014) draws straight to the canvas, with no depth of
  // field, bloom or refraction
  const lite = quality.lite;
  const renderer = makeRenderer(canvas, quality, { post: !lite });
  renderer.transmissionResolutionScale = 0.5;
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 12);
  const key = new THREE.DirectionalLight("#fff3e2", 1.6);
  key.position.set(4, 6, 6);
  const rim = new THREE.SpotLight(config.glow, 90, 30, 0.7, 1, 2);
  rim.position.set(4, 2, -6);
  const rim2 = new THREE.SpotLight(config.glow, 50, 30, 0.7, 1, 2);
  rim2.position.set(-5, -1, -5);
  scene.add(key, rim, rim2, rim.target, rim2.target);

  // the mood color as soft light on the back wall, fading to the page color
  // well inside the frame
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 20),
    new THREE.ShaderMaterial({
      uniforms: {
        uGlow: { value: new THREE.Color(config.glow) },
        uBg: { value: new THREE.Color(studioCanvas("day")) },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGlow, uBg; varying vec2 vUv;
        ${UNTONEMAP_GLSL}
        void main(){
          vec2 d = (vUv - vec2(0.72, 0.62)) * vec2(2.0, 1.0);
          vec3 col = mix(uBg, mix(uBg, uGlow, 0.32), exp(-dot(d, d) * 5.0) * 0.75);
          gl_FragColor = vec4(untonemap(col), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  wash.position.z = -8;
  scene.add(wash);
  // the page color behind everything, recolored when the theme changes
  const recolor = (theme: Theme) => {
    scene.background = studioBackground(!lite, theme);
    (wash.material.uniforms.uBg!.value as THREE.Color).set(studioCanvas(theme));
  };
  recolor(currentTheme());

  const mats = floaterMaterials({ lite });
  const total = quality.mobile ? 9 : 18;
  const random = rng(mood.length * 97 + 13);
  const kinds = [
    { geometry: iceGeometry(5, 1), material: mats.ice, size: [0.55, 0.9] },
    { geometry: leafGeometry(), material: mats.leaf, size: [0.7, 1.1] },
    { geometry: beanGeometry(), material: mats.bean, size: [0.35, 0.5] },
  ] as const;
  const items: {
    mesh: THREE.Mesh;
    base: THREE.Vector3;
    spin: THREE.Vector3;
    phase: number;
  }[] = [];
  kinds.forEach((kind, k) => {
    const count = Math.round(total * (config.mix[k] ?? 0));
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(kind.geometry, kind.material);
      const s = kind.size[0] + random() * (kind.size[1] - kind.size[0]);
      mesh.scale.setScalar(s);
      // keep the left side, where the heading sits, mostly clear
      const x = 1 + random() * 8 - (random() < 0.25 ? 9 : 0);
      const base = new THREE.Vector3(
        x,
        (random() - 0.5) * 6,
        -5 + random() * 7,
      );
      mesh.position.copy(base);
      mesh.rotation.set(random() * 6, random() * 6, random() * 6);
      scene.add(mesh);
      items.push({
        mesh,
        base,
        spin: new THREE.Vector3(
          random() - 0.5,
          random() - 0.5,
          random() - 0.5,
        ).multiplyScalar(0.5),
        phase: random() * 6,
      });
    }
  });

  if (lite) liteMaterials(scene);
  const post = lite
    ? null
    : makePost(renderer, scene, camera, quality, {
        focus: 11.5,
        aperture: 0.0012,
        bloom: 0.3,
      });
  const fewerPixels = () => {
    renderer.setPixelRatio(0.75);
    resize();
  };
  const budget = new FrameBudget(
    FRAME_BUDGET_MS,
    post
      ? [
          () => {
            post.degrade();
            renderer.setPixelRatio(1);
            resize();
          },
          fewerPixels,
        ]
      : [fewerPixels],
    quality.forceHigh,
  );

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    post?.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.9 ? 55 : 35;
    camera.updateProjectionMatrix();
    // stretch the back-wall wash so it always fills the frame edge to edge
    const distance = camera.position.z - wash.position.z;
    const height =
      2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    wash.scale.set((height * camera.aspect * 1.1) / 40, (height * 1.1) / 20, 1);
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const st = { time: 0, tx: 0, ty: 0, scroll: 0 };
  function frame(dt: number) {
    budget.push(dt * 1000);
    st.time += dt;
    st.tx = damp(st.tx, pointer.x, 2, dt);
    st.ty = damp(st.ty, pointer.y, 2, dt);
    st.scroll = damp(
      st.scroll,
      Math.min(1, window.scrollY / Math.max(1, window.innerHeight)),
      4,
      dt,
    );
    for (const item of items) {
      const depth = (item.base.z + 5) / 7;
      item.mesh.position.set(
        item.base.x + st.tx * depth * 0.6,
        item.base.y +
          Math.sin(st.time * 0.5 + item.phase) * 0.25 +
          st.scroll * depth * 2.5 +
          st.ty * depth * 0.3,
        item.base.z,
      );
      item.mesh.rotation.x += item.spin.x * dt;
      item.mesh.rotation.y += item.spin.y * dt;
      item.mesh.rotation.z += item.spin.z * dt;
    }
    if (post) post.render(dt, st.time);
    else renderer.render(scene, camera);
  }

  // the shaders compile off the main thread before the scene is shown
  await (post ? post.precompile() : renderer.compileAsync(scene, camera));
  // products or pieces shown later have their first draw now, out of sight
  warmUp(renderer, scene, () =>
    post ? post.render(0, 0) : renderer.render(scene, camera),
  );

  const stopTheme = followTheme(recolor);
  return {
    frame,
    dispose() {
      stopTheme();
      observer.disconnect();
      post?.dispose();
      disposeScene(scene, renderer);
    },
  };
}
