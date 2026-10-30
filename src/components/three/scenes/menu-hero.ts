import * as THREE from "three";

import { DRINKS_GLOW } from "@/components/menu/category-glow";

import { makePost } from "../engine/post";
import {
  disposeScene,
  makeRenderer,
  shadowPacer,
  studioEnvironment,
  warmUp,
} from "../engine/renderer";
import {
  FRAME_BUDGET_MS,
  FrameBudget,
  clamp01,
  damp,
  fontFamilies,
  pointer,
  smooth,
  type Quality,
} from "../engine/runtime";
import { studioBackground } from "../engine/studio";
import {
  beanGeometry,
  contactShadowTexture,
  floaterMaterials,
  iceGeometry,
  leafGeometry,
  liteMaterials,
  makeCup,
} from "./models";
import {
  makeBackdrop,
  makeFloaters,
  titleTexture,
  type Floaters,
} from "./showcase";

/**
 * Menu hero: the featured iced drinks turning slowly on the studio set, a
 * backlit "THE MENU" letterform behind them (the clear cups refract it),
 * floating ice, beans and tea leaves, and matcha-green and amber rim
 * lights. Scrolling dollies the camera in and lifts the cups apart as the
 * page hands over to the menu grid.
 */
export async function initMenuHero(
  canvas: HTMLCanvasElement,
  quality: Quality,
  hud: { progress: () => number },
) {
  // the lite tier (ADR-014) draws straight to the canvas, with no post
  // effects, shadows or refraction
  const lite = quality.lite;
  const renderer = makeRenderer(canvas, quality, {
    shadows: true,
    post: !lite,
  });
  const shadows = shadowPacer(renderer);
  renderer.transmissionResolutionScale = quality.mobile ? 0.5 : 1;
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.background = studioBackground(!lite);
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.2, 11);

  const { display } = fontFamilies();
  const { mesh: backdrop, material: backdropMaterial } = makeBackdrop();
  scene.add(backdrop);
  const title = titleTexture("THE MENU", display);
  const u = backdropMaterial.uniforms;
  u.uA!.value = title;
  u.uB!.value = title;
  u.uMix!.value = 0;

  const key = new THREE.DirectionalLight("#fff4e6", 2.4);
  key.position.set(3.5, 6, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(
    quality.mobile ? 512 : 1024,
    quality.mobile ? 512 : 1024,
  );
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#dfe6ff", 0.35);
  fill.position.set(-6, 2, 4);
  scene.add(fill);
  // two colored strip lights behind the set: the glow is the rim, not neon
  const rimLeft = new THREE.SpotLight(DRINKS_GLOW.a, 75, 20, 0.55, 0.9, 2);
  rimLeft.position.set(-4, 2.6, -3.2);
  const rimRight = new THREE.SpotLight(DRINKS_GLOW.b, 60, 20, 0.55, 0.9, 2);
  rimRight.position.set(4, 1.8, -3.4);
  scene.add(rimLeft, rimRight, rimLeft.target, rimRight.target);

  // featured drinks: matcha either side of a Cat-Feine latte (one on phones)
  const stage = new THREE.Group();
  scene.add(stage);
  const layout = quality.mobile
    ? [{ drink: 0, x: 0, z: 0, s: 1, phase: 0 }]
    : [
        { drink: 0, x: -2.75, z: -1.1, s: 0.8, phase: 1.9 },
        { drink: 1, x: 0, z: 0, s: 1, phase: 0 },
        { drink: 0, x: 2.75, z: -1.1, s: 0.8, phase: 3.7 },
      ];
  const cups = await Promise.all(
    layout.map(async (slot) => {
      const cup = await makeCup("/three/cat-sticker.png", { lite });
      cup.setDrink(slot.drink);
      stage.add(cup.group);
      return { ...slot, cup };
    }),
  );

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 7),
    new THREE.ShadowMaterial({ opacity: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  if (!lite) scene.add(floor);
  const contactTexture = contactShadowTexture();
  const contacts = cups.map((slot) => {
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4 * slot.s, 1.2 * slot.s),
      new THREE.MeshBasicMaterial({
        map: contactTexture,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    scene.add(contact);
    return contact;
  });

  const k = quality.mobile ? 0.5 : 1;
  const mats = floaterMaterials({ lite });
  const floaters: Floaters[] = [
    makeFloaters(
      iceGeometry(7, 1),
      mats.ice,
      Math.round(10 * k),
      [1],
      [0.3, 0.55],
      7,
      quality.mobile,
    ),
    makeFloaters(
      beanGeometry(),
      mats.bean,
      Math.round(14 * k),
      [1],
      [0.2, 0.3],
      19,
      quality.mobile,
    ),
    makeFloaters(
      leafGeometry(),
      mats.leaf,
      Math.round(8 * k),
      [1],
      [0.4, 0.7],
      11,
      quality.mobile,
    ),
  ];
  floaters.forEach((f) => scene.add(f.mesh));
  if (lite) liteMaterials(scene);

  const post = lite
    ? null
    : makePost(renderer, scene, camera, quality, { focus: 11 });
  // slow frames switch off the heaviest effects first, then draw fewer
  // pixels; the lite tier has nothing left to switch off, so only the second
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
            renderer.transmissionResolutionScale = 0.5;
            shadows.slowDown();
            resize();
          },
          fewerPixels,
        ]
      : [fewerPixels],
    quality.forceHigh,
  );

  let width = 1;
  let height = 1;
  let mobileLayout = false;
  function resize() {
    const rect = canvas.parentElement?.getBoundingClientRect();
    width = Math.max(1, rect?.width ?? 1);
    height = Math.max(1, rect?.height ?? 1);
    renderer.setSize(width, height, false);
    post?.setSize(width, height);
    camera.aspect = width / height;
    mobileLayout = camera.aspect < 0.85;
    camera.fov = mobileLayout ? 44 : 32;
    camera.updateProjectionMatrix();
    const distance = camera.position.z + 6;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    backdrop.position.set(0, camera.position.y, -6);
    backdrop.scale.set(h * camera.aspect * 1.3, h * 1.3, 1);
    u.uAspect!.value = camera.aspect;
    // the plane is 1.3× the view, so map screen fractions into its UVs
    const w = mobileLayout ? 0.76 : 0.6;
    const th = (w * width * (640 / 2048)) / height;
    const cy = 0.5 + ((mobileLayout ? 0.72 : 0.76) - 0.5) / 1.3;
    (u.uRect!.value as THREE.Vector4).set((1 - w) / 2, cy - th / 2, w, th);
  }
  resize();
  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  (u.uGlow!.value as THREE.Color)
    .set(DRINKS_GLOW.a)
    .lerp(new THREE.Color(DRINKS_GLOW.b), 0.35);
  const state = { intro: 0, p: 0, tx: 0, ty: 0, time: 0 };
  const v3 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();

  function frame(dt: number) {
    budget.push(dt * 1000);
    state.time += dt;
    state.p = damp(state.p, clamp01(hud.progress()), 6, dt);
    state.tx = damp(state.tx, pointer.x, 3, dt);
    state.ty = damp(state.ty, pointer.y, 3, dt);
    const { intro, p, time } = state;
    const out = smooth(0, 1, p);

    u.uReveal!.value = intro;
    u.uGlowStr!.value = (0.3 + 0.7 * intro) * (1 - out * 0.6);
    rimLeft.intensity = 75 * (0.3 + 0.7 * intro);
    rimRight.intensity = 60 * (0.3 + 0.7 * intro);

    // camera dollies in and rises as the hero hands over to the grid
    camera.position.set(0, 0.2 + out * 1.4, 11 - out * 2.6);
    camera.lookAt(0, 0.1 + out * 0.6, 0);

    const s0 = mobileLayout ? 0.82 : 0.84;
    const baseY = mobileLayout ? -0.35 : -0.75;
    stage.position.set(0, baseY + Math.sin(time * 0.9) * 0.05, 0);
    stage.rotation.set(-state.ty * 0.1, state.tx * 0.2, -state.tx * 0.08);
    cups.forEach((slot, i) => {
      const spread = 1 + out * 0.55;
      slot.cup.group.position.set(
        slot.x * spread,
        (1 - intro) * -1.8 + out * (1.2 + i * 0.35),
        slot.z - out * 1.2,
      );
      slot.cup.group.rotation.set(
        0.06 + out * 0.3,
        time * 0.28 + slot.phase + (1 - intro) * -1.4,
        (slot.x === 0 ? 0 : Math.sign(slot.x) * -0.04) - out * 0.1,
      );
      slot.cup.group.scale.setScalar(s0 * slot.s * (0.85 + 0.15 * intro));
    });

    for (const floater of floaters) {
      const w = intro;
      floater.mesh.visible = w > 0.01;
      if (!floater.mesh.visible) continue;
      for (let i = 0; i < floater.base.length; i++) {
        const b = floater.base[i];
        const r = floater.rot[i];
        const sp = floater.spin[i];
        if (!b || !r || !sp) continue;
        const depth = (b.z + 4) / 6;
        v3.set(
          b.x + state.tx * depth * 0.5,
          b.y +
            Math.sin(time * 0.6 + i) * 0.16 +
            out * depth * 3 +
            state.ty * depth * 0.3,
          b.z + out * depth * 1.5,
        );
        euler.set(r.x + sp.x * time, r.y + sp.y * time, r.z + sp.z * time);
        const sz = (floater.size[i] ?? 0.3) * smooth(0, 1, w);
        m4.compose(v3, q.setFromEuler(euler), scale.set(sz, sz, sz));
        floater.mesh.setMatrixAt(i, m4);
      }
      floater.mesh.instanceMatrix.needsUpdate = true;
    }

    v3.set(0, stage.position.y + 0.2, 0).project(camera);
    (u.uCenter!.value as THREE.Vector2).set(v3.x * 0.5 + 0.5, v3.y * 0.5 + 0.5);
    const floorY = stage.position.y - 1.95 * s0;
    floor.position.y = floorY;
    cups.forEach((slot, i) => {
      const contact = contacts[i];
      if (!contact) return;
      contact.position.set(
        slot.cup.group.position.x,
        floorY + 0.01,
        slot.cup.group.position.z,
      );
      (contact.material as THREE.MeshBasicMaterial).opacity =
        0.75 * (1 - clamp01(slot.cup.group.position.y / 1.5));
    });
    rimLeft.target.position.set(0, stage.position.y, 0);
    rimRight.target.position.set(0, stage.position.y, 0);

    shadows.beforeFrame();
    if (post) post.render(dt, time);
    else renderer.render(scene, camera);
  }

  // every product's shaders are ready before the scene is shown
  await (post ? post.precompile() : renderer.compileAsync(scene, camera));
  // products or pieces shown later have their first draw now, out of sight
  warmUp(renderer, scene, () =>
    post ? post.render(0, 0) : renderer.render(scene, camera),
  );

  return {
    frame,
    state,
    dispose() {
      observer.disconnect();
      post?.dispose();
      title.dispose();
      disposeScene(scene, renderer);
    },
  };
}
