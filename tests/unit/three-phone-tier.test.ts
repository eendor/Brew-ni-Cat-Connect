import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getQuality,
  lightGpu,
  resetFrameBudgets,
} from "@/components/three/engine/runtime";
import { condensationMaps } from "@/components/three/engine/textures";
import {
  floaterMaterials,
  liteMaterials,
  makeBuldak,
  makeCup,
  makeFries,
  makeTakoyaki,
} from "@/components/three/scenes/models";

// jsdom loads no images, so the cup's sticker is a blank texture here
vi.mock("@/components/three/engine/renderer", async (importOriginal) => {
  const { Texture } = await import("three");
  return {
    ...(await importOriginal<
      typeof import("@/components/three/engine/renderer")
    >()),
    photoTexture: async () => new Texture(),
  };
});

function materialsOf(root: THREE.Object3D) {
  const found = new Set<THREE.Material>();
  root.traverse((object) => {
    const material = (object as THREE.Mesh).material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      found.add(m);
    }
  });
  return [...found];
}

function physicalOf(root: THREE.Object3D) {
  return materialsOf(root).filter(
    (m): m is THREE.MeshPhysicalMaterial =>
      (m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial === true,
  );
}

/** The pixels of a generated map; every generated map is a DataTexture. */
function imageOf(texture: THREE.Texture | null | undefined) {
  return (texture as THREE.DataTexture | null | undefined)?.image;
}

/** Width of the largest generated (data) map on the model. */
function largestMap(root: THREE.Object3D) {
  let largest = 0;
  for (const material of materialsOf(root)) {
    for (const value of Object.values(material)) {
      if ((value as THREE.DataTexture | null)?.isDataTexture) {
        largest = Math.max(
          largest,
          imageOf(value as THREE.Texture)?.width ?? 0,
        );
      }
    }
  }
  return largest;
}

describe("Phone and integrated GPU tier (TC-P4-124 – TC-P4-126, TC-P4-190)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetFrameBudgets();
    window.history.replaceState(null, "", "/");
  });

  it("TC-P4-124 — the phone tier turns clear parts into a gloss and drops refraction, clearcoat and sheen", async () => {
    const cup = await makeCup("/three/cat-sticker.png", { lite: true });
    const floaters = floaterMaterials({ lite: true });
    const root = new THREE.Group();
    root.add(
      cup.group,
      makeTakoyaki(true, { lite: true }),
      makeFries(true),
      makeBuldak(true),
      ...Object.values(floaters).map(
        (material) => new THREE.Mesh(new THREE.BoxGeometry(), material),
      ),
    );
    // on desktop the cup wall, its lid (two meshes) and the floating ice
    // refract the scene behind them
    const clear = physicalOf(root).filter((m) => m.transmission > 0);
    expect(clear).toHaveLength(3);
    const colors = clear.map((m) => m.color.clone());
    const drink = cup.liquid.material as THREE.MeshPhysicalMaterial;

    liteMaterials(root);
    // a second pass changes nothing more
    liteMaterials(root);

    for (const material of physicalOf(root)) {
      expect(material.transmission).toBe(0);
      expect(material.clearcoat).toBe(0);
      expect(material.sheen).toBe(0);
    }
    clear.forEach((material, index) => {
      expect(material.blending).toBe(THREE.AdditiveBlending);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      // dimmed once, even for the lid's two meshes and the second pass
      const before = colors[index]!;
      expect(material.color.r).toBeCloseTo(before.r * 0.12, 6);
      expect(material.color.g).toBeCloseTo(before.g * 0.12, 6);
      expect(material.color.b).toBeCloseTo(before.b * 0.12, 6);
    });
    // the drink stays opaque, so it still reads through the cup
    expect(drink.blending).toBe(THREE.NormalBlending);
    expect(drink.transparent).toBe(false);
    expect(drink.depthWrite).toBe(true);
  });

  it("TC-P4-125 — the phone tier's generated maps are half size; desktop keeps its sizes", async () => {
    expect(largestMap((await makeCup("/s.png", { lite: true })).group)).toBe(
      256,
    );
    expect(largestMap((await makeCup("/s.png")).group)).toBe(512);
    expect(largestMap(makeTakoyaki(true, { lite: true }))).toBe(128);
    expect(largestMap(makeTakoyaki(true))).toBe(256);

    const lite = floaterMaterials({ lite: true });
    const full = floaterMaterials();
    expect(imageOf(lite.ice.normalMap)?.width).toBe(128);
    expect(imageOf(full.ice.normalMap)?.width).toBe(256);
    expect(imageOf(lite.leaf.map)?.width).toBe(128);
    expect(imageOf(full.leaf.map)?.width).toBe(256);
    // the phone tier changes map sizes only; liteMaterials does the rest
    expect(lite.ice.transmission).toBe(1);
    expect(lite.leaf.sheen).toBe(full.leaf.sheen);
  });

  it("TC-P4-126 — a half-size condensation map keeps the drops at the same share of the cup", () => {
    // drops are the smoothest pixels in the roughness map; the fog is 0.18 and up
    const dropShare = (size: number) => {
      const data = imageOf(condensationMaps(size, 3).roughnessMap)
        ?.data as Uint8Array;
      let drops = 0;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i] ?? 255) < 0.1 * 255) drops++;
      }
      return drops / (size * size);
    };
    const full = dropShare(512);
    const half = dropShare(256);
    expect(full).toBeGreaterThan(0.1);
    // keeping 512's drop count at their 512 sizes would double the share
    expect(Math.abs(half - full) / full).toBeLessThan(0.05);
  });

  it("TC-P4-190 — phones, integrated and software GPUs get the lite tier at 1×; discrete and Apple GPUs keep the full tier; `?quality=` overrides both", () => {
    // integrated, phone and software GPUs, by the name the browser reports
    for (const name of [
      "ANGLE (Intel, Mesa Intel(R) Graphics (ADL GT2), OpenGL ES 3.2)",
      "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "AMD Radeon Vega 8 Graphics",
      "AMD Radeon 780M Graphics (radeonsi, gfx1103_r1)",
      "Mali-G57 MC2",
      "Adreno (TM) 610",
      "PowerVR Rogue GE8320",
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
      "llvmpipe (LLVM 17.0.6, 256 bits)",
      "Microsoft Basic Render Driver",
    ]) {
      expect(lightGpu(name), name).toBe(true);
    }
    // discrete cards, Apple silicon, and a browser that hides the name
    for (const name of [
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
      "",
    ]) {
      expect(lightGpu(name), name).toBe(false);
    }

    const UNMASKED_RENDERER = 0x9246;
    const device = (phone: boolean, gpu: string, search = "") => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: phone,
        media: query,
      }));
      vi.stubGlobal("WebGL2RenderingContext", class {});
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        RENDERER: 0x1f01,
        getExtension: (name: string) =>
          name === "WEBGL_debug_renderer_info"
            ? { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER }
            : name === "WEBGL_lose_context"
              ? { loseContext: () => {} }
              : null,
        getParameter: (key: number) =>
          key === UNMASKED_RENDERER ? gpu : "WebGL 2",
      } as never);
      window.history.replaceState(null, "", `/${search}`);
      resetFrameBudgets();
      return getQuality();
    };
    const intel =
      "ANGLE (Intel, Mesa Intel(R) Graphics (ADL GT2), OpenGL ES 3.2)";
    const nvidia = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU, D3D11)";

    expect(device(true, "Adreno (TM) 610")).toEqual({
      mobile: true,
      maxDpr: 1,
      forceHigh: false,
      lite: true,
    });
    expect(device(true, "Adreno (TM) 610", "?quality=high")).toEqual({
      mobile: true,
      maxDpr: 1.25,
      forceHigh: true,
      lite: false,
    });
    expect(device(false, intel)).toEqual({
      mobile: false,
      maxDpr: 1,
      forceHigh: false,
      lite: true,
    });
    expect(device(false, intel, "?quality=high")).toEqual({
      mobile: false,
      maxDpr: 1.5,
      forceHigh: true,
      lite: false,
    });
    expect(device(false, nvidia)).toEqual({
      mobile: false,
      maxDpr: 1.5,
      forceHigh: false,
      lite: false,
    });
    expect(device(false, nvidia, "?quality=lite")).toEqual({
      mobile: false,
      maxDpr: 1,
      forceHigh: false,
      lite: true,
    });
  });
});
