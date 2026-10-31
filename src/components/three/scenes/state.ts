import * as THREE from "three";

import { DRINKS_GLOW } from "@/components/menu/category-glow";
import type { Theme } from "@/lib/theme/theme";

import {
  disposeScene,
  makeRenderer,
  studioEnvironment,
  warmUp,
} from "../engine/renderer";
import {
  clamp01,
  damp,
  fontFamilies,
  pointer,
  smooth,
  type Quality,
} from "../engine/runtime";
import { currentTheme, followTheme, studioCanvas } from "../engine/studio";
import {
  beanGeometry,
  contactShadowTexture,
  floaterMaterials,
  iceGeometry,
  leafGeometry,
  liteMaterials,
  makeCup,
} from "./models";
import { makeBackdrop, themeBackdrop, titleTexture } from "./showcase";

export type StateKind = "empty" | "ready" | "lost";
const CUP_SCALE = 0.8;
/** Cup base (model space) after scaling: where the contact shadow sits. */
const BASE_Y = -1.5 * CUP_SCALE;

type Drifter = {
  mesh: THREE.Mesh;
  size: number;
  angle: number;
  radius: number;
  height: number;
  speed: number;
  spin: THREE.Vector3;
};

/**
 * Small realistic vignettes for the site's states, built from the showcase
 * models under the same studio HDRI and brand rim lights:
 *
 * - `empty`: the shop's clear cup with nothing poured yet, turning slowly
 *   while ice and coffee beans drift around it (an empty cart).
 * - `ready`: the same cup filling up with matcha as tea leaves and ice rise
 *   past it (the order summary is ready).
 * - `lost`: the empty cup tipped over on a shadowed floor in front of a
 *   backlit "404" (page not found).
 */
export async function initState(
  canvas: HTMLCanvasElement,
  quality: Quality,
  kind: StateKind,
) {
  const lost = kind === "lost";
  // small canvases can afford antialiasing on every device
  const renderer = makeRenderer(
    canvas,
    { ...quality, mobile: false },
    // see-through, so the scene sits on any panel without an edge; the 404
    // stage fills its band with the cream wall instead
    { shadows: lost, alpha: !lost },
  );
  renderer.transmissionResolutionScale = 0.75;
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.65;
  const camera = new THREE.PerspectiveCamera(lost ? 32 : 28, 1, 0.1, 60);

  const key = new THREE.DirectionalLight("#fff4e6", 2.3);
  key.position.set(3, 6, 6);
  const fill = new THREE.DirectionalLight("#dfe6ff", 0.35);
  fill.position.set(-5, 2, 4);
  // the brand's two rim colors from behind, as on the menu hero
  const rimA = new THREE.SpotLight(DRINKS_GLOW.a, 55, 20, 0.6, 0.9, 2);
  rimA.position.set(-3.6, 2.6, -3.2);
  const rimB = new THREE.SpotLight(DRINKS_GLOW.b, 45, 20, 0.6, 0.9, 2);
  rimB.position.set(3.6, 1.8, -3.4);
  scene.add(key, fill, rimA, rimB, rimA.target, rimB.target);

  const stage = new THREE.Group();
  scene.add(stage);
  const cup = await makeCup("/three/cat-sticker.png");
  cup.setDrink(0);
  cup.setFill(0);
  cup.group.scale.setScalar(CUP_SCALE);

  const shadowTexture = contactShadowTexture();
  const mats = floaterMaterials();
  const drifters: Drifter[] = [];
  const addDrifter = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    size: number,
    index: number,
    count: number,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(size);
    mesh.rotation.set(index * 1.7, index * 0.9, index * 2.3);
    stage.add(mesh);
    drifters.push({
      mesh,
      size,
      angle: (index / count) * Math.PI * 2,
      radius: 1.75 + (index % 3) * 0.28,
      height: -0.7 + ((index * 0.61) % 1) * 2.2,
      speed: 0.22 + (index % 4) * 0.06,
      spin: new THREE.Vector3(
        0.3 + (index % 3) * 0.2,
        0.2 + (index % 2) * 0.3,
        0.1 + (index % 4) * 0.1,
      ),
    });
  };

  let backdropMesh: THREE.Mesh | null = null;
  let backlight: THREE.Mesh | null = null;
  let backdropUniforms: Record<string, THREE.IUniform> | null = null;
  let backdropMaterial: THREE.ShaderMaterial | null = null;
  let title: THREE.Texture | null = null;
  const roll = new THREE.Group();
  let floorY = BASE_Y;

  if (lost) {
    const { display } = fontFamilies();
    const backdrop = makeBackdrop();
    title = titleTexture("404", display);
    backdropMaterial = backdrop.material;
    backdropUniforms = backdrop.material.uniforms;
    backdropUniforms.uA!.value = title;
    backdropUniforms.uB!.value = title;
    backdropUniforms.uMix!.value = 0;
    (backdropUniforms.uGlow!.value as THREE.Color)
      .set(DRINKS_GLOW.a)
      .lerp(new THREE.Color(DRINKS_GLOW.b), 0.5);
    scene.add(backdrop.mesh);
    backdropMesh = backdrop.mesh;

    // the cup lies on its side, rocking a little on its rim
    floorY = -1.25;
    const lying = new THREE.Group();
    lying.rotation.z = Math.PI / 2 - 0.06;
    lying.position.set(0.2, floorY + 0.74 * CUP_SCALE, 0.4);
    roll.add(cup.group);
    lying.add(roll);
    stage.add(lying);
    cup.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 6),
      new THREE.ShadowMaterial({ opacity: 0.55 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    stage.add(floor);
    // beans and two ice cubes spilled across the floor
    const beans = beanGeometry();
    [
      [-2.4, 0.9, 0.4],
      [-1.6, 1.6, 1.9],
      [1.9, 1.3, 2.6],
      [2.6, 0.2, 0.8],
      [-0.9, 2.1, 0.2],
      [1.2, 2.3, 1.2],
    ].forEach(([x = 0, z = 0, r = 0]) => {
      const bean = new THREE.Mesh(beans, mats.bean);
      bean.scale.setScalar(0.22);
      bean.position.set(x, floorY + 0.06, z - 0.8);
      bean.rotation.set(Math.PI / 2, r, r * 0.5);
      bean.castShadow = true;
      stage.add(bean);
    });
    [
      [-1.9, 1.3, 0.5],
      [1.4, 1.9, 1.1],
    ].forEach(([x = 0, z = 0, r = 0], index) => {
      const cube = new THREE.Mesh(iceGeometry(40 + index), mats.ice);
      cube.position.set(x, floorY + 0.2, z - 0.4);
      cube.rotation.set(r, r * 1.3, 0);
      cube.castShadow = true;
      stage.add(cube);
    });
  } else {
    // a soft pool of white light on the panel behind the cup, fading out
    // before the canvas edge: clear plastic and ice read as clear against it
    backlight = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        uniforms: { uAspect: { value: 1 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uAspect; varying vec2 vUv;
          void main(){
            vec2 d = (vUv - vec2(0.5, 0.56)) * vec2(uAspect, 1.0);
            float k = smoothstep(0.47, 0.0, length(d));
            gl_FragColor = vec4(1.0, 1.0, 1.0, k * k * 0.6);
          }`,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    backlight.renderOrder = -10;
    backlight.position.z = -4;
    scene.add(backlight);
    stage.add(cup.group);
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.3),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = BASE_Y + 0.01;
    stage.add(contact);
    if (kind === "empty") {
      const ice = iceGeometry(9, 1);
      const bean = beanGeometry();
      for (let i = 0; i < 7; i++) {
        if (i % 2 === 0) addDrifter(ice, mats.ice, 0.32, i, 7);
        else addDrifter(bean, mats.bean, 0.2, i, 7);
      }
    } else {
      const leaf = leafGeometry();
      const ice = iceGeometry(13, 1);
      for (let i = 0; i < 8; i++) {
        if (i % 3 === 2) addDrifter(ice, mats.ice, 0.3, i, 8);
        else addDrifter(leaf, mats.leaf, 0.42, i, 8);
      }
    }
  }

  let width = 1;
  let height = 1;
  function resize() {
    const box = canvas.parentElement?.getBoundingClientRect();
    width = Math.max(1, box?.width ?? 1);
    height = Math.max(1, box?.height ?? 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (lost) {
      const narrow = camera.aspect < 0.95;
      camera.fov = narrow ? 44 : 32;
      camera.position.set(0, 0.7, narrow ? 12.5 : 11);
      camera.lookAt(0, 0.2, 0);
      camera.updateProjectionMatrix();
      const backdrop = backdropMesh;
      if (backdrop && backdropUniforms) {
        const distance = camera.position.z + 6;
        const h =
          2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
        backdrop.position.set(0, camera.position.y, -6);
        backdrop.scale.set(h * camera.aspect * 1.3, h * 1.3, 1);
        backdropUniforms.uAspect!.value = camera.aspect;
        const w = narrow ? 0.72 : 0.5;
        const th = (w * width * (640 / 2048)) / height;
        const cy = 0.5 + ((narrow ? 0.7 : 0.66) - 0.5) / 1.3;
        (backdropUniforms.uRect!.value as THREE.Vector4).set(
          (1 - w) / 2,
          cy - th / 2,
          w,
          th,
        );
      }
    } else {
      camera.position.set(0, 0.35, 10.5);
      camera.lookAt(0, 0.25, 0);
      camera.updateProjectionMatrix();
      if (backlight) {
        // fill the view at the wall's distance, a little past the edges
        const distance = camera.position.z + 4;
        const h =
          2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
        backlight.position.y = 0.25;
        backlight.scale.set(h * camera.aspect * 1.05, h * 1.05, 1);
        const material = backlight.material as THREE.ShaderMaterial;
        material.uniforms.uAspect!.value = camera.aspect;
      }
    }
  }
  resize();
  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  const state = { time: 0, tx: 0, ty: 0 };

  function frame(dt: number) {
    state.time += dt;
    const t = state.time;
    state.tx = damp(state.tx, pointer.x, 3, dt);
    state.ty = damp(state.ty, pointer.y, 3, dt);
    stage.rotation.set(-state.ty * 0.06, state.tx * 0.22, 0);

    if (lost) {
      const reveal = smooth(0, 1.6, t);
      if (backdropUniforms) {
        backdropUniforms.uReveal!.value = reveal;
        backdropUniforms.uGlowStr!.value = 0.35 + 0.55 * reveal;
      }
      roll.rotation.y = Math.sin(t * 0.9) * 0.14;
    } else {
      const intro = smooth(0, 1.1, t);
      cup.group.position.y = (1 - intro) * -0.5 + Math.sin(t * 0.9) * 0.04;
      cup.group.rotation.y = t * 0.35 + (1 - intro) * -1.2;
      cup.group.scale.setScalar(CUP_SCALE * (0.9 + 0.1 * intro));
      if (kind === "ready") {
        // pour: the matcha rises after a beat and settles near the top
        cup.setFill(0.92 * smooth(0.35, 2.6, t));
      }
      for (const drifter of drifters) {
        drifter.angle += drifter.speed * dt;
        const rising =
          kind === "ready"
            ? ((drifter.height + 1.2 + t * drifter.speed * 0.9) % 3.6) - 1.4
            : drifter.height + Math.sin(t * 0.7 + drifter.angle) * 0.18;
        drifter.mesh.position.set(
          Math.cos(drifter.angle) * drifter.radius,
          rising,
          Math.sin(drifter.angle) * drifter.radius * 0.7,
        );
        drifter.mesh.rotation.x += drifter.spin.x * dt;
        drifter.mesh.rotation.y += drifter.spin.y * dt;
        drifter.mesh.rotation.z += drifter.spin.z * dt;
        // grow in with the cup; risers shrink away at the top and grow
        // back in at the bottom, so the loop never pops
        const fade =
          kind === "ready"
            ? Math.min(
                clamp01((2.2 - rising) / 0.6),
                clamp01((rising + 1.4) / 0.5),
              )
            : 1;
        const scale = drifter.size * intro * fade;
        drifter.mesh.visible = scale > 0.005;
        drifter.mesh.scale.setScalar(Math.max(scale, 0.0001));
      }
    }
    renderer.render(scene, camera);
  }

  // the lite tier (ADR-014) shows clear parts as a gloss, not refraction
  if (quality.lite) liteMaterials(scene);

  // the 404 stage fills its band with the page's wall, recolored when the
  // theme changes; the other states are see-through
  const recolor = (theme: Theme) => {
    if (!lost) return;
    scene.background = new THREE.Color(studioCanvas(theme));
    if (backdropMaterial) themeBackdrop(backdropMaterial, theme);
  };
  recolor(currentTheme());

  // shaders compile off the main thread and have their first draw now,
  // before the scene is shown, not in the frames scrolled past it
  await renderer.compileAsync(scene, camera);
  warmUp(renderer, scene, () => renderer.render(scene, camera));

  const stopTheme = followTheme(recolor);
  return {
    frame,
    dispose() {
      stopTheme();
      observer.disconnect();
      title?.dispose();
      disposeScene(scene, renderer);
    },
  };
}
