import * as THREE from "three";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { BokehShader } from "three/addons/shaders/BokehShader.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LEAN,
  LEAN_CHUNKS,
  leanFragment,
} from "@/components/three/engine/lean-shaders";
import {
  DOF_TAPS,
  DOF_TIERS,
  POST_TRANSMISSION_CHUNK,
  dofRing,
  makePost,
} from "@/components/three/engine/post";
import type { Quality } from "@/components/three/engine/runtime";

/** A tap as [x, y, weight], in BokehShader's `dofblur` units. */
type Kernel = ReadonlyArray<readonly [number, number, number]>;

const desktop: Quality = {
  mobile: false,
  maxDpr: 1.5,
  forceHigh: false,
  lite: false,
};

/** BokehShader's 40 taps around its centre, as [x, y, scale of the blur]. */
function bokehTaps() {
  const source = BokehShader.fragmentShader;
  const scales: Record<string, number> = { dofblur: 1 };
  for (const [, name, value] of source.matchAll(
    /vec2 (dofblur\d) = dofblur \* ([\d.]+);/g,
  )) {
    scales[name!] = Number(value);
  }
  return [
    ...source.matchAll(
      /vec2\(\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\)\s*\*\s*aspectcorrect\s*\)\s*\*\s*(dofblur\d?)\s*\)/g,
    ),
  ].map(([, x, y, name]) => [Number(x), Number(y), scales[name!]!] as const);
}

const byPosition = (taps: ReadonlyArray<readonly number[]>) =>
  taps.map((tap) => tap.map((n) => n.toFixed(4)).join(",")).sort();

const scaled = (
  taps: ReadonlyArray<readonly [number, number]>,
  scale: number,
  weight: number,
): Kernel => taps.map(([x, y]) => [x * scale, y * scale, weight] as const);

/** BokehShader's 41 taps. */
const FULL: Kernel = [
  [0, 0, 1 / 41],
  ...scaled(DOF_TAPS.ring, 1, 1 / 41),
  ...scaled(DOF_TAPS.odd, 0.9, 1 / 41),
  ...scaled(DOF_TAPS.even, 0.7, 1 / 41),
  ...scaled(DOF_TAPS.even, 0.4, 1 / 41),
];
const MERGED: Kernel = [
  [0, 0, 1 / 41],
  ...scaled(DOF_TAPS.even, 1, 1 / 41),
  ...scaled(DOF_TAPS.paired, 1, 2 / 41),
];
function nine(reach: number): Kernel {
  const { radius, centreWeight } = dofRing(reach);
  return [
    [0, 0, centreWeight],
    ...scaled(DOF_TAPS.circle, radius, (1 - centreWeight) / 8),
  ];
}

/**
 * How a kernel spreads one pixel's light over its neighbours when each tap
 * reads the image with bilinear filtering, for a blur reaching `reach`
 * pixels. The shader runs at each pixel's centre, as here.
 */
function spread(kernel: Kernel, reach: number) {
  const size = 9;
  const middle = 4;
  const grid = new Float64Array(size * size);
  for (const [x, y, weight] of kernel) {
    const px = x * reach;
    const py = y * reach;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const fx = px - x0;
    const fy = py - y0;
    for (const [dx, wx] of [
      [0, 1 - fx],
      [1, fx],
    ] as const) {
      for (const [dy, wy] of [
        [0, 1 - fy],
        [1, fy],
      ] as const) {
        const i = (middle + y0 + dy) * size + middle + x0 + dx;
        grid[i] = (grid[i] ?? 0) + weight * wx * wy;
      }
    }
  }
  return grid;
}

const difference = (a: Float64Array, b: Float64Array) =>
  a.reduce((sum, value, i) => sum + Math.abs(value - (b[i] ?? 0)), 0);

/** A renderer that keeps track of what each draw went to. */
function standInRenderer(scene: THREE.Scene, camera: THREE.Camera) {
  let target: THREE.WebGLRenderTarget | null = null;
  const draws: Array<{
    object: THREE.Object3D;
    target: THREE.WebGLRenderTarget | null;
    mask: number;
  }> = [];
  // three.js's own glass target: multisampled and mipmapped
  const glassPass = new THREE.WebGLRenderTarget(8, 8, {
    samples: 4,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const renderer = {
    autoClear: true,
    toneMapping: THREE.NeutralToneMapping,
    toneMappingExposure: 1.1,
    outputColorSpace: THREE.SRGBColorSpace,
    transmissionResolutionScale: 1,
    getPixelRatio: () => 2,
    getClearAlpha: () => 1,
    getClearColor: (color: THREE.Color) => color,
    setClearColor: () => {},
    getRenderTarget: () => target,
    setRenderTarget(next: THREE.WebGLRenderTarget | null) {
      target = next;
    },
    compileAsync: async () => {},
    render(object: THREE.Object3D) {
      draws.push({ object, target, mask: camera.layers.mask });
      if (object !== scene) return;
      // as three.js does: its glass pass first, then the scene, opaque
      // objects first and then each glass object
      const own = target;
      this.setRenderTarget(glassPass);
      draws.push({
        object: scene,
        target: glassPass,
        mask: camera.layers.mask,
      });
      this.setRenderTarget(own);
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as THREE.Material;
        material.onBeforeRender(
          this as never,
          scene,
          camera,
          mesh.geometry,
          mesh,
          null as never,
        );
      });
    },
  };
  return { renderer, draws, glassPass };
}

/** What three.js hands `onBeforeCompile` for a physical material. */
const physicalShader = () => ({
  vertexShader: THREE.ShaderLib.physical.vertexShader,
  fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  uniforms: {} as Record<string, THREE.IUniform>,
});

// jsdom doesn't decode images
beforeEach(() => {
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: () => Promise.resolve(),
  });
});

afterEach(() => {
  Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
});

describe("3D effects (TC-P4-280 – TC-P4-286)", () => {
  it("TC-P4-280 — the depth of field uses BokehShader's 41 taps, and its merged taps keep their weight and spread", () => {
    const bokeh = bokehTaps();
    expect(bokeh).toHaveLength(40);
    expect(BokehShader.fragmentShader).toMatch(/gl_FragColor = col \/ 41\.0;/);
    expect(byPosition(FULL.slice(1).map(([x, y]) => [x, y]))).toEqual(
      byPosition(bokeh.map(([x, y, scale]) => [x * scale, y * scale])),
    );

    // 1 + 8 + 16 × 2 = 41 taps' weight, with the same spread
    const moment = (kernel: Kernel) =>
      kernel.reduce((sum, [x, y, w]) => sum + w * (x * x + y * y), 0);
    expect(MERGED.reduce((sum, [, , w]) => sum + w, 0)).toBeCloseTo(1, 12);
    expect(moment(MERGED)).toBeCloseTo(moment(FULL), 12);
  });

  it("TC-P4-281 — each cheaper blur stays within 2% of the 41 taps over the blur it is used for", () => {
    const worst = { single: 0, ring: 0, merged: 0 };
    for (let step = 0; step * 0.005 <= DOF_TIERS.merged + 1e-9; step++) {
      const reach = step * 0.005;
      const reference = spread(FULL, reach);
      if (reach < DOF_TIERS.single) {
        const l1 = difference(spread([[0, 0, 1]], reach), reference);
        worst.single = Math.max(worst.single, l1);
      } else if (reach <= DOF_TIERS.ring) {
        const l1 = difference(spread(nine(reach), reach), reference);
        worst.ring = Math.max(worst.ring, l1);
      } else {
        const l1 = difference(spread(MERGED, reach), reference);
        worst.merged = Math.max(worst.merged, l1);
      }
    }
    // an L1 of 0.04 moves 2% of a pixel's light; the grain moves more
    expect(worst.single).toBeLessThanOrEqual(0.04);
    expect(worst.ring).toBeLessThanOrEqual(0.04);
    expect(worst.merged).toBeLessThanOrEqual(0.04);
  });

  it("TC-P4-282 — glass refracts the effects' copy of the scene, and only on a renderer drawing through them", () => {
    // three.js names its glass sampler in one chunk only, so swapping that
    // chunk moves every use
    const users = Object.entries(THREE.ShaderChunk)
      .filter(([, source]) => source.includes("transmissionSamplerMap"))
      .map(([name]) => name);
    expect(users).toEqual(["transmission_pars_fragment"]);
    expect(THREE.ShaderLib.physical.fragmentShader).toContain(
      "#include <transmission_pars_fragment>",
    );
    expect(POST_TRANSMISSION_CHUNK).not.toContain("transmissionSampler");
    expect(POST_TRANSMISSION_CHUNK).toContain(
      "uniform sampler2D postTransmissionMap;",
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const glass = new THREE.MeshPhysicalMaterial({ transmission: 1 });
    const solid = new THREE.MeshPhysicalMaterial();
    scene.add(
      new THREE.Mesh(new THREE.BoxGeometry(), glass),
      new THREE.Mesh(new THREE.BoxGeometry(), solid),
    );
    const { renderer } = standInRenderer(scene, camera);
    const post = makePost(
      renderer as unknown as THREE.WebGLRenderer,
      scene,
      camera,
      desktop,
    );

    const shader = physicalShader();
    glass.onBeforeCompile(shader as never, renderer as never);
    expect(shader.fragmentShader).toContain("postTransmissionMap");
    expect(shader.fragmentShader).not.toContain(
      "#include <transmission_pars_fragment>",
    );
    expect(shader.uniforms).toHaveProperty("postTransmissionMap");
    expect(shader.uniforms).toHaveProperty("postTransmissionSize");
    expect(glass.customProgramCacheKey()).toMatch(/\|post-glass$/);
    expect(solid.customProgramCacheKey()).not.toContain("post-glass");

    // another renderer, drawing the same material without the effects,
    // keeps three.js's own glass
    const elsewhere = physicalShader();
    glass.onBeforeCompile(elsewhere as never, {} as never);
    expect(elsewhere.fragmentShader).toContain(
      "#include <transmission_pars_fragment>",
    );

    const setRenderTarget = renderer.setRenderTarget;
    post.dispose();
    expect(renderer.setRenderTarget).not.toBe(setRenderTarget);
    const after = physicalShader();
    glass.onBeforeCompile(after as never, renderer as never);
    expect(after.fragmentShader).toContain(
      "#include <transmission_pars_fragment>",
    );
  });

  it("TC-P4-283 — a frame draws the scene once, copies it for the glass once, and hides it from three.js's own glass pass", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.layers.enable(3);
    const mask = camera.layers.mask;
    const glass = new THREE.MeshPhysicalMaterial({ transmission: 1 });
    const ice = new THREE.MeshPhysicalMaterial({ transmission: 1 });
    scene.add(
      new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()),
      new THREE.Mesh(new THREE.BoxGeometry(), glass),
      new THREE.Mesh(new THREE.BoxGeometry(), ice),
    );
    const { renderer, draws, glassPass } = standInRenderer(scene, camera);
    const post = makePost(
      renderer as unknown as THREE.WebGLRenderer,
      scene,
      camera,
      desktop,
    );
    post.setSize(400, 300);
    const shader = physicalShader();
    glass.onBeforeCompile(shader as never, renderer as never);
    // three.js's glass pass draws a few pixels at most
    expect(renderer.transmissionResolutionScale).toBeCloseTo(8 / 600);

    post.render(1 / 60, 1);

    const scenes = draws.filter(
      (draw) => draw.object === scene && draw.target !== glassPass,
    );
    expect(scenes).toHaveLength(1);
    const sceneTarget = scenes[0]!.target!;
    expect(sceneTarget.width).toBe(800);
    expect(sceneTarget.depthTexture).toBeInstanceOf(THREE.DepthTexture);

    // three.js's glass pass sees nothing; the scene itself, everything
    expect(draws.find((draw) => draw.target === glassPass)?.mask).toBe(0);
    expect(scenes[0]!.mask).toBe(mask);
    expect(camera.layers.mask).toBe(mask);

    // one copy for both glass objects, taken while the scene was drawing,
    // which the glass then reads
    const copies = draws.filter(
      (draw) =>
        draw.object !== scene &&
        draw.target?.texture === shader.uniforms.postTransmissionMap!.value,
    );
    expect(copies).toHaveLength(1);
    expect(
      (shader.uniforms.postTransmissionSize!.value as THREE.Vector2).toArray(),
    ).toEqual([800, 600]);

    // then the bloom, the composite and SMAA, ending on the canvas
    const effects = draws.filter((draw) => draw.object !== scene);
    expect(effects).toHaveLength(17);
    expect(effects.at(-1)!.target).toBeNull();
    post.dispose();
  });

  it("TC-P4-284 — SMAA's lookup images still come with three.js", () => {
    const pass = SMAAPass.prototype as unknown as {
      _getAreaTexture(): string;
      _getSearchTexture(): string;
    };
    expect(pass._getAreaTexture()).toMatch(/^data:image\/png;base64,/);
    expect(pass._getSearchTexture()).toMatch(/^data:image\/png;base64,/);
  });

  it("TC-P4-285 — a slow device's steps: the depth of field goes to one tap, then the glow's passes stop", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const { renderer } = standInRenderer(scene, camera);
    // the effects reuse one quad, so each draw's material is noted as it draws
    const drawn: Array<{
      material: THREE.ShaderMaterial;
      target: THREE.WebGLRenderTarget | null;
    }> = [];
    const render = renderer.render.bind(renderer);
    renderer.render = (object: THREE.Object3D) => {
      if (object !== scene) {
        drawn.push({
          material: (object as THREE.Mesh).material as THREE.ShaderMaterial,
          target: renderer.getRenderTarget(),
        });
      }
      render(object);
    };
    const post = makePost(
      renderer as unknown as THREE.WebGLRenderer,
      scene,
      camera,
      desktop,
    );
    post.setSize(400, 300);
    const frame = () => {
      drawn.length = 0;
      post.render(1 / 60, 1);
      return drawn.map(({ material, target }) => ({
        target,
        aperture: material?.uniforms?.aperture?.value as number | undefined,
        bloom: material?.uniforms?.bloomStrength?.value as number | undefined,
      }));
    };
    const of = (effects: ReturnType<typeof frame>, key: "aperture" | "bloom") =>
      effects.flatMap((effect) =>
        effect[key] === undefined ? [] : [effect[key]],
      );

    const full = frame();
    expect(of(full, "aperture")).not.toHaveLength(0);
    expect(of(full, "aperture").every((value) => value > 0)).toBe(true);
    expect(of(full, "bloom")).not.toHaveLength(0);
    expect(of(full, "bloom").every((value) => value > 0)).toBe(true);

    post.dropDepthOfField();
    const sharp = frame();
    expect(sharp).toHaveLength(full.length);
    expect(of(sharp, "aperture").every((value) => value === 0)).toBe(true);

    post.degrade();
    const plain = frame();
    // the bright pass and both blur passes of each of the bloom's 5 sizes
    expect(plain).toHaveLength(full.length - 11);
    expect(of(plain, "bloom")).not.toHaveLength(0);
    expect(of(plain, "bloom").every((value) => value === 0)).toBe(true);
    expect(plain.at(-1)!.target).toBeNull();
    post.dispose();
  });

  it("TC-P4-286 — the leaner shaders still match this three.js: both chunk rewrites apply, and every constant changes the lit shader", () => {
    expect(LEAN_CHUNKS.lights).not.toBeNull();
    expect(LEAN_CHUNKS.environment).not.toBeNull();
    const source = THREE.ShaderLib.physical.fragmentShader;
    const plain = leanFragment(source, 0);
    expect(plain).not.toContain("#include <lights_fragment_begin>");
    expect(plain).not.toContain("#include <cube_uv_reflection_fragment>");
    for (const bit of Object.values(LEAN)) {
      expect(leanFragment(source, bit)).not.toBe(plain);
    }
  });
});
