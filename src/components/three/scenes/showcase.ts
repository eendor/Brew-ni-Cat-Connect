import * as THREE from "three";

import { makePost } from "../engine/post";
import {
  canvasTexture,
  context2d,
  disposeScene,
  makeRenderer,
  studioEnvironment,
} from "../engine/renderer";
import {
  FrameBudget,
  clamp01,
  damp,
  fontFamilies,
  pointer,
  smooth,
  type Quality,
} from "../engine/runtime";
import type { ShowcaseItem } from "../showcase-data";
import {
  beanGeometry,
  chiliGeometry,
  contactShadowTexture,
  flakeGeometry,
  floaterMaterials,
  iceGeometry,
  leafGeometry,
  makeBuldak,
  makeCup,
  makeFries,
  makeTakoyaki,
} from "./models";

const BG = new THREE.Color("#0B0A0D");

/** Large display-face title drawn once per product for the lit back wall. */
export function titleTexture(text: string, family: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 640;
  const g = context2d(canvas);
  let size = 640;
  g.font = `900 ${size}px ${family}`;
  const width = g.measureText(text).width;
  if (width > 1720) size *= 1720 / width;
  g.font = `900 ${size}px ${family}`;
  const metrics = g.measureText(text);
  g.textAlign = "center";
  g.fillStyle = "#fff";
  g.fillText(
    text,
    1024,
    320 +
      (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2,
  );
  const texture = canvasTexture(canvas, false);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Back wall: a softly lit studio sweep with the product name as a large
 * backlit letterform. Opaque, so the clear cup refracts it.
 */
export function makeBackdrop() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uA: { value: null as THREE.Texture | null },
      uB: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uReveal: { value: 0 },
      uGlow: { value: new THREE.Color("#7CFF6B") },
      uBg: { value: BG.clone() },
      uCenter: { value: new THREE.Vector2(0.5, 0.45) },
      uRect: { value: new THREE.Vector4(0.07, 0.4, 0.86, 0.27) },
      uAspect: { value: 1.6 },
      uGlowStr: { value: 0.6 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uA, uB;
      uniform float uMix, uReveal, uAspect, uGlowStr;
      uniform vec3 uGlow, uBg;
      uniform vec2 uCenter;
      uniform vec4 uRect;
      varying vec2 vUv;
      float sampleT(sampler2D t, vec2 uv){
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
        return texture2D(t, uv).a;
      }
      float sampleBlur(sampler2D t, vec2 uv){
        vec2 e = smoothstep(vec2(0.0), vec2(0.06), uv) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - uv);
        return texture2D(t, clamp(uv, 0.0, 1.0), 4.5).a * e.x * e.y;
      }
      void main(){
        vec2 suv = vUv;
        // studio sweep: a lifted floor-to-wall gradient, warm-neutral
        vec3 col = uBg + vec3(0.018, 0.016, 0.02) * smoothstep(0.0, 0.6, suv.y);
        vec2 d = (suv - uCenter) * vec2(uAspect, 1.0) / min(uAspect, 1.0);
        float r2 = dot(d, d);
        // coloured backlight spilling on the wall behind the product
        float spill = exp(-r2 * 4.0) * 0.12 + exp(-r2 * 18.0) * 0.18;
        col += uGlow * spill * uGlowStr;
        vec2 tuv = (suv - uRect.xy) / uRect.zw;
        float ea = smoothstep(0.0, 0.55, uMix), eb = smoothstep(0.45, 1.0, uMix);
        float a = sampleT(uA, tuv + vec2(0.0, ea * 0.3)) * (1.0 - ea);
        float b = sampleT(uB, tuv - vec2(0.0, (1.0 - eb) * 0.3)) * eb;
        float rv = smoothstep(0.0, 0.2, uReveal * 1.2 - tuv.y);
        float t = max(a, b) * rv;
        float halo = (sampleBlur(uA, tuv + vec2(0.0, ea * 0.3)) * (1.0 - ea)
          + sampleBlur(uB, tuv - vec2(0.0, (1.0 - eb) * 0.3)) * eb) * rv;
        col += uGlow * halo * 0.28 * uGlowStr;
        // letters read like a backlit acrylic panel, not a flat neon fill
        vec3 face = mix(vec3(0.92, 0.9, 0.86), uGlow, 0.28) * mix(0.55, 1.0, tuv.y);
        col = mix(col, face, t * 0.92);
        vec2 v = (suv - 0.5) * vec2(uAspect, 1.0);
        col *= 1.0 - 0.5 * smoothstep(0.3, 1.15, length(v));
        gl_FragColor = vec4(max(col, 0.0), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = -10;
  return { mesh, material };
}

export type Floaters = {
  mesh: THREE.InstancedMesh;
  base: THREE.Vector3[];
  rot: THREE.Vector3[];
  spin: THREE.Vector3[];
  size: number[];
  weights: readonly number[];
};

export function makeFloaters(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  count: number,
  weights: readonly number[],
  sizeRange: readonly [number, number],
  seed: number,
  mobile: boolean,
): Floaters {
  let s = seed;
  const random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  const base: THREE.Vector3[] = [];
  const rot: THREE.Vector3[] = [];
  const spin: THREE.Vector3[] = [];
  const size: number[] = [];
  for (let i = 0; i < count; i++) {
    let x = (random() - 0.5) * 11;
    let y = (random() - 0.5) * 7.5;
    const z = -3.6 + random() * 4.6;
    if (Math.abs(x) < 1.8 && z > -1.5)
      x = Math.sign(x || 1) * (1.8 + random() * 3);
    if (x < -2.2 && y < -1.2 && z > -2) y = 1.2 + random() * 2;
    if (mobile) {
      x *= 0.5;
      y *= 1.15;
    }
    base.push(new THREE.Vector3(x, y, z));
    rot.push(new THREE.Vector3(random() * 6, random() * 6, random() * 6));
    spin.push(
      new THREE.Vector3(
        random() - 0.5,
        random() - 0.5,
        random() - 0.5,
      ).multiplyScalar(0.7),
    );
    size.push(sizeRange[0] + random() * (sizeRange[1] - sizeRange[0]));
  }
  return { mesh, base, rot, spin, size, weights };
}

export type ShowcaseHud = {
  onProduct: (index: number) => void;
  onGlow: (hex: string) => void;
  progress: () => number;
};

export async function initShowcase(
  canvas: HTMLCanvasElement,
  items: readonly ShowcaseItem[],
  quality: Quality,
  hud: ShowcaseHud,
) {
  const renderer = makeRenderer(canvas, quality, { shadows: true });
  renderer.transmissionResolutionScale = quality.mobile ? 0.5 : 1;
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.2, 11);

  const { display } = fontFamilies();
  const { mesh: backdrop, material: backdropMaterial } = makeBackdrop();
  scene.add(backdrop);
  const titles = items.map((item) =>
    titleTexture(item.name.toUpperCase(), display),
  );
  const last = items.length - 1;
  backdropMaterial.uniforms.uA!.value = titles[0] ?? null;
  backdropMaterial.uniforms.uB!.value = titles[1] ?? null;

  // studio rig: a large soft key, a fill, and two coloured strip lights
  // behind the product acting as rim lights (the glow is the rim, not neon)
  const key = new THREE.DirectionalLight("#fff4e6", 2.4);
  key.position.set(3.5, 6, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(
    quality.mobile ? 512 : 1024,
    quality.mobile ? 512 : 1024,
  );
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

  const stage = new THREE.Group();
  scene.add(stage);
  const cup = await makeCup("/three/cat-sticker.png");
  const takoyaki = makeTakoyaki(quality.mobile);
  const fries = makeFries(quality.mobile);
  const buldak = makeBuldak(quality.mobile);
  stage.add(cup.group, takoyaki, fries, buldak);
  [takoyaki, fries, buldak].forEach((g) => (g.visible = false));

  // soft shadow catcher plus a contact occlusion blob under the product
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 6),
    new THREE.ShadowMaterial({ opacity: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.6),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  scene.add(contact);
  const spillTexture = contactShadowTexture();
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.8),
    new THREE.MeshBasicMaterial({
      alphaMap: spillTexture,
      color: "#7CFF6B",
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  spill.rotation.x = -Math.PI / 2;
  scene.add(spill);

  // floating ingredients; weights = presence per product
  const k = quality.mobile ? 0.5 : 1;
  const mats = floaterMaterials();
  const floaters: Floaters[] = [
    makeFloaters(
      iceGeometry(7, 1),
      mats.ice,
      Math.round(8 * k),
      [1, 1, 0, 0, 0],
      [0.32, 0.55],
      7,
      quality.mobile,
    ),
    makeFloaters(
      leafGeometry(),
      mats.leaf,
      Math.round(12 * k),
      [1, 0, 0, 0, 0],
      [0.45, 0.75],
      11,
      quality.mobile,
    ),
    makeFloaters(
      beanGeometry(),
      mats.bean,
      Math.round(12 * k),
      [0, 1, 0, 0, 0],
      [0.2, 0.3],
      19,
      quality.mobile,
    ),
    makeFloaters(
      flakeGeometry(),
      mats.flake,
      Math.round(14 * k),
      [0, 0, 1, 0, 0],
      [0.5, 0.8],
      23,
      quality.mobile,
    ),
    makeFloaters(
      iceGeometry(9, 0.14).scale(1, 7.5, 1),
      mats.fry,
      Math.round(10 * k),
      [0, 0, 0, 1, 0],
      [0.7, 1],
      31,
      quality.mobile,
    ),
    makeFloaters(
      chiliGeometry(),
      mats.chili,
      Math.round(16 * k),
      [0, 0, 0, 0, 1],
      [0.12, 0.2],
      37,
      quality.mobile,
    ),
  ];
  floaters.forEach((f) => scene.add(f.mesh));

  const post = makePost(renderer, scene, camera, quality, { focus: 11 });
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

  let width = 1;
  let height = 1;
  let mobileLayout = false;
  function resize() {
    const rect = canvas.parentElement?.getBoundingClientRect();
    width = Math.max(1, rect?.width ?? 1);
    height = Math.max(1, rect?.height ?? 1);
    renderer.setSize(width, height, false);
    post.setSize(width, height);
    camera.aspect = width / height;
    mobileLayout = camera.aspect < 0.85;
    camera.fov = mobileLayout ? 44 : 32;
    camera.updateProjectionMatrix();
    const distance = camera.position.z + 6;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    backdrop.position.set(0, camera.position.y, -6);
    backdrop.scale.set(h * camera.aspect, h, 1);
    const u = backdropMaterial.uniforms;
    u.uAspect!.value = camera.aspect;
    const w = mobileLayout ? 1.1 : 1.02;
    const th = (w * width * (640 / 2048)) / height;
    (u.uRect!.value as THREE.Vector4).set(
      (1 - w) / 2,
      (mobileLayout ? 0.8 : 0.56) - th / 2,
      w,
      th,
    );
  }
  resize();
  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  const glowColors = items.map((item) => new THREE.Color(item.glow));
  const glow = new THREE.Color();
  const v3 = new THREE.Vector3();
  const state = { intro: 0, p: 0, tx: 0, ty: 0, time: 0, lastIndex: -1 };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();

  /** Enter 1→0 as `from` approaches, leave 0→1 after it. */
  const travel = (p: number, index: number) => ({
    enter: smooth(0, 1, clamp01(p - (index - 1))),
    exit: smooth(0, 1, clamp01(p - index)),
  });

  function frame(dt: number) {
    budget.push(dt * 1000);
    state.time += dt;
    const target = hud.progress();
    const raw = clamp01(target) * (last + 0.5) - 0.15;
    const baseIndex = Math.min(last, Math.max(0, Math.floor(raw)));
    const pTarget = Math.min(
      last,
      baseIndex + smooth(0.3, 0.8, raw - baseIndex),
    );
    state.p = damp(state.p, pTarget, 5, dt);
    const p = state.p;
    state.tx = damp(state.tx, pointer.x, 3, dt);
    state.ty = damp(state.ty, pointer.y, 3, dt);
    const intro = state.intro;

    const i0 = Math.floor(Math.min(p, last - 0.001));
    const f = p - i0;
    glow
      .copy(glowColors[i0] ?? glow)
      .lerp(glowColors[Math.min(last, i0 + 1)] ?? glow, f);
    const u = backdropMaterial.uniforms;
    (u.uGlow!.value as THREE.Color).copy(glow);
    rimLeft.color.copy(glow);
    rimRight.color.copy(glow);
    (spill.material as THREE.MeshBasicMaterial).color.copy(glow);
    u.uA!.value = titles[i0] ?? null;
    u.uB!.value = titles[Math.min(last, i0 + 1)] ?? null;
    u.uMix!.value = smooth(0.15, 0.85, f);
    u.uReveal!.value = intro;
    u.uGlowStr!.value = 0.3 + 0.7 * intro;
    rimLeft.intensity = 70 * (0.3 + 0.7 * intro);
    rimRight.intensity = 55 * (0.3 + 0.7 * intro);
    const index = Math.round(p);
    if (index !== state.lastIndex) {
      state.lastIndex = index;
      hud.onProduct(index);
    }
    hud.onGlow(`#${glow.getHexString()}`);

    const s0 = mobileLayout ? 0.74 : 1;
    const baseY = mobileLayout ? 0.85 : -0.1;
    const idleY = Math.sin(state.time * 0.9) * 0.06;
    stage.position.set(0, baseY + idleY, 0);
    stage.rotation.set(-state.ty * 0.13, state.tx * 0.25, -state.tx * 0.12);

    // cup: matcha → cat-feine (index 0 → 1), then lifts away
    const cupT = clamp01(p);
    const exitCup = clamp01(p - 1);
    cup.setDrink(smooth(0.2, 0.8, cupT));
    cup.group.visible = p < 1.98;
    cup.group.position.set(
      -exitCup * 3.2,
      (1 - intro) * -1.6 + exitCup * 4.5,
      -exitCup * 2,
    );
    cup.group.rotation.set(
      0.08 + exitCup * 0.8,
      state.time * 0.3 + cupT * Math.PI * 2 + (1 - intro) * -1.6 + exitCup * 2,
      exitCup * 0.6 - 0.05,
    );
    cup.group.scale.setScalar(
      s0 *
        (1 - 0.1 * Math.sin(cupT * Math.PI)) *
        (1 - exitCup * 0.35) *
        (0.8 + 0.2 * intro),
    );

    const tako = travel(p, 2);
    takoyaki.visible = p > 1.02 && p < 2.98;
    takoyaki.position.set(
      tako.exit * 3.4,
      -5 * (1 - tako.enter) + tako.exit * 4.6,
      -tako.exit * 2,
    );
    takoyaki.rotation.set(
      tako.exit * 0.9,
      -Math.PI * 1.2 * (1 - tako.enter) +
        Math.sin(state.time * 0.5) * 0.35 +
        tako.exit * 2,
      0,
    );
    takoyaki.scale.setScalar(s0 * 1.05 * (1 - tako.exit * 0.35));

    const fr = travel(p, 3);
    fries.visible = p > 2.02 && p < 3.98;
    fries.position.set(
      -fr.exit * 3.4,
      -5.5 * (1 - fr.enter) + fr.exit * 4.6,
      -fr.exit * 2,
    );
    fries.rotation.set(
      fr.exit * 0.6,
      -Math.PI * (1 - fr.enter) + state.time * 0.3,
      0,
    );
    fries.scale.setScalar(s0 * 1.08 * (1 - fr.exit * 0.35));

    const bu = travel(p, 4);
    buldak.visible = p > 3.02;
    buldak.position.set(0, -5.5 * (1 - bu.enter) - 0.3, 0);
    buldak.rotation.set(0, Math.sin(state.time * 0.4) * 0.25, 0);
    (buldak.userData.spin as THREE.Object3D | undefined)?.rotation.set(
      0,
      -Math.PI * (1 - bu.enter) + state.time * 0.25,
      0,
    );
    buldak.scale.setScalar(s0 * 1.05);

    const presence = items.map((_, i) => Math.max(0, 1 - Math.abs(p - i)));
    for (const floater of floaters) {
      const w =
        floater.weights.reduce((a, wv, i) => a + wv * (presence[i] ?? 0), 0) *
        intro;
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
            Math.sin(state.time * 0.6 + i) * 0.16 +
            (target - 0.5) * depth * 3.5 +
            state.ty * depth * 0.3,
          b.z,
        );
        euler.set(
          r.x + sp.x * state.time,
          r.y + sp.y * state.time,
          r.z + sp.z * state.time,
        );
        const sz = (floater.size[i] ?? 0.3) * smooth(0, 1, w);
        m4.compose(v3, q.setFromEuler(euler), scale.set(sz, sz, sz));
        floater.mesh.setMatrixAt(i, m4);
      }
      floater.mesh.instanceMatrix.needsUpdate = true;
    }

    v3.set(0, stage.position.y + 0.1, 0).project(camera);
    (u.uCenter!.value as THREE.Vector2).set(v3.x * 0.5 + 0.5, v3.y * 0.5 + 0.5);
    const floorY = stage.position.y - 1.95 * s0;
    floor.position.y = floorY;
    contact.position.y = floorY + 0.01;
    spill.position.y = floorY + 0.02;
    rimLeft.target.position.set(0, stage.position.y, 0);
    rimRight.target.position.set(0, stage.position.y, 0);

    post.render(dt, state.time);
  }

  return {
    frame,
    state,
    dispose() {
      observer.disconnect();
      post.dispose();
      titles.forEach((t) => t.dispose());
      disposeScene(scene, renderer);
    },
  };
}
