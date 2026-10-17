import * as THREE from "three";

/**
 * Procedural PBR maps (albedo, normal, roughness) generated on the client.
 * They give the modelled food, ice and cups real surface detail without
 * shipping large texture files. Every map is small (128–512px) and tiled.
 */

export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Tileable fractal value noise in [0, 1]. */
export function fbm(size: number, seed: number, octaves = 5, base = 4) {
  const out = new Float32Array(size * size);
  const random = rng(seed);
  let amplitude = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = base << o;
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = random();
    const at = (x: number, y: number) =>
      grid[((y + cells) % cells) * cells + ((x + cells) % cells)] ?? 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = fx - ix;
        const ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
        const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
        const index = y * size + x;
        out[index] = (out[index] ?? 0) + (a + (b - a) * sy) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) / total;
  return out;
}

function dataTexture(data: Uint8Array, size: number, srgb: boolean) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Tangent-space normal map from a height field (Sobel, tileable). */
export function normalFromHeight(
  height: Float32Array,
  size: number,
  strength: number,
) {
  const data = new Uint8Array(size * size * 4);
  const h = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)] ?? 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        h(x + 1, y - 1) +
        2 * h(x + 1, y) +
        h(x + 1, y + 1) -
        (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      const dy =
        h(x - 1, y + 1) +
        2 * h(x, y + 1) +
        h(x + 1, y + 1) -
        (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
      const nx = -dx * strength;
      const ny = -dy * strength;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return dataTexture(data, size, false);
}

function greyTexture(values: Float32Array, size: number) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(Math.min(1, Math.max(0, values[i] ?? 0)) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return dataTexture(data, size, false);
}

/** Albedo from a two-to-three stop palette driven by a noise field. */
function paletteTexture(
  field: Float32Array,
  size: number,
  stops: readonly (readonly [number, string])[],
) {
  const data = new Uint8Array(size * size * 4);
  const colors = stops.map(([t, hex]) => [t, new THREE.Color(hex)] as const);
  const tmp = new THREE.Color();
  for (let i = 0; i < size * size; i++) {
    const v = field[i] ?? 0;
    let picked = false;
    for (let s = 0; s < colors.length - 1; s++) {
      const a = colors[s];
      const b = colors[s + 1];
      if (a && b && v <= b[0]) {
        const t = Math.min(1, Math.max(0, (v - a[0]) / (b[0] - a[0] || 1)));
        tmp.copy(a[1]).lerp(b[1], t);
        picked = true;
        break;
      }
    }
    if (!picked) tmp.copy(colors[colors.length - 1]?.[1] ?? tmp);
    // palette stops are sRGB hex values; store them as sRGB bytes
    const srgb = tmp.clone().convertLinearToSRGB();
    data[i * 4] = srgb.r * 255;
    data[i * 4 + 1] = srgb.g * 255;
    data[i * 4 + 2] = srgb.b * 255;
    data[i * 4 + 3] = 255;
  }
  return dataTexture(data, size, true);
}

export type SurfaceMaps = Readonly<{
  map?: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}>;

/**
 * Condensation on a cold cup: beaded droplets of mixed size over a light
 * fog. Droplets are smooth (low roughness) and bulge in the normal map.
 */
export function condensationMaps(size = 512, seed = 3): SurfaceMaps {
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size).fill(0.32);
  const random = rng(seed);
  const fog = fbm(size, seed + 9, 4, 8);
  for (let i = 0; i < rough.length; i++) rough[i] = 0.18 + (fog[i] ?? 0) * 0.22;
  const drops = Math.round(size * 1.6);
  for (let d = 0; d < drops; d++) {
    const cx = random() * size;
    const cy = random() * size;
    const big = random() > 0.9;
    const r = big ? 5 + random() * 7 : 1.2 + random() * 3.2;
    const stretch = big ? 1.2 + random() * 0.6 : 1;
    for (let y = -Math.ceil(r * stretch); y <= Math.ceil(r * stretch); y++) {
      for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
        const q = (x * x) / (r * r) + (y * y) / (r * r * stretch * stretch);
        if (q > 1) continue;
        const px = (Math.floor(cx + x) + size) % size;
        const py = (Math.floor(cy + y) + size) % size;
        const i = py * size + px;
        const dome = Math.sqrt(1 - q) * r * 0.22;
        height[i] = Math.max(height[i] ?? 0, dome);
        rough[i] = 0.03;
      }
    }
  }
  return {
    normalMap: normalFromHeight(height, size, 1.1),
    roughnessMap: greyTexture(rough, size),
  };
}

/** Ice: internal fractures and trapped air read through a normal map. */
export function iceMaps(size = 256, seed = 17): SurfaceMaps {
  const n = fbm(size, seed, 5, 3);
  const cracks = new Float32Array(size * size);
  for (let i = 0; i < n.length; i++) {
    const v = n[i] ?? 0;
    cracks[i] = Math.abs(Math.sin(v * 38)) < 0.08 ? 0.6 : v * 0.35;
  }
  const rough = new Float32Array(size * size);
  for (let i = 0; i < n.length; i++) rough[i] = 0.04 + (n[i] ?? 0) * 0.2;
  return {
    normalMap: normalFromHeight(cracks, size, 2.4),
    roughnessMap: greyTexture(rough, size),
  };
}

/** Golden fried batter with darker browned patches and pores. */
export function batterMaps(size = 256, seed = 5): SurfaceMaps {
  const n = fbm(size, seed, 6, 4);
  const pores = fbm(size, seed + 1, 3, 24);
  const field = new Float32Array(size * size);
  const height = new Float32Array(size * size);
  for (let i = 0; i < field.length; i++) {
    field[i] = (n[i] ?? 0) * 0.85 + (pores[i] ?? 0) * 0.15;
    height[i] = (n[i] ?? 0) * 0.6 + ((pores[i] ?? 0) > 0.62 ? -0.4 : 0);
  }
  const rough = new Float32Array(size * size);
  for (let i = 0; i < rough.length; i++) rough[i] = 0.55 + (n[i] ?? 0) * 0.3;
  return {
    map: paletteTexture(field, size, [
      [0.25, "#5a2a0e"],
      [0.48, "#9a5420"],
      [0.62, "#c27a34"],
      [0.8, "#d99a4e"],
    ]),
    normalMap: normalFromHeight(height, size, 3),
    roughnessMap: greyTexture(rough, size),
  };
}

/** Glossy brown takoyaki sauce or gochujang buldak sauce. */
export function sauceMaps(
  base: string,
  dark: string,
  size = 128,
  seed = 8,
): SurfaceMaps {
  const n = fbm(size, seed, 4, 3);
  const rough = new Float32Array(size * size);
  for (let i = 0; i < rough.length; i++) rough[i] = 0.12 + (n[i] ?? 0) * 0.18;
  return {
    map: paletteTexture(n, size, [
      [0.3, dark],
      [0.75, base],
    ]),
    normalMap: normalFromHeight(n, size, 1.2),
    roughnessMap: greyTexture(rough, size),
  };
}

/** Potato fry: pale gold core, darker crisp edges, fine lengthwise grain. */
export function fryMaps(size = 128, seed = 21): SurfaceMaps {
  const n = fbm(size, seed, 5, 4);
  const field = new Float32Array(size * size);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const grain = Math.sin((x / size) * Math.PI * 22 + (n[i] ?? 0) * 4) * 0.5;
      field[i] = (n[i] ?? 0) * 0.8 + grain * 0.08;
      height[i] = (n[i] ?? 0) * 0.5 + grain * 0.15;
    }
  }
  const rough = new Float32Array(size * size);
  for (let i = 0; i < rough.length; i++) rough[i] = 0.5 + (n[i] ?? 0) * 0.25;
  return {
    map: paletteTexture(field, size, [
      [0.25, "#b36d1c"],
      [0.5, "#dca047"],
      [0.75, "#efc56f"],
    ]),
    normalMap: normalFromHeight(height, size, 2),
    roughnessMap: greyTexture(rough, size),
  };
}

/** Roasted coffee bean skin with an oily sheen. */
export function beanMaps(size = 128, seed = 31): SurfaceMaps {
  const n = fbm(size, seed, 5, 6);
  const rough = new Float32Array(size * size);
  for (let i = 0; i < rough.length; i++) rough[i] = 0.3 + (n[i] ?? 0) * 0.35;
  return {
    map: paletteTexture(n, size, [
      [0.3, "#1f0f07"],
      [0.6, "#3b1f0f"],
      [0.85, "#5a3218"],
    ]),
    normalMap: normalFromHeight(n, size, 1.6),
    roughnessMap: greyTexture(rough, size),
  };
}

/**
 * Tea leaf: midrib plus alternating lateral veins, with colour variation
 * from the stem out. UV space is the leaf's bounding box.
 */
export function leafMaps(size = 256, seed = 41): SurfaceMaps {
  const n = fbm(size, seed, 4, 6);
  const field = new Float32Array(size * size);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = x / size - 0.5;
      const v = y / size;
      const mid = Math.exp(-Math.pow(u * 70, 2));
      const lateral =
        Math.exp(
          -Math.pow(Math.sin((v * 9 - Math.abs(u) * 6) * Math.PI) * 6, 2),
        ) *
        (1 - mid) *
        0.6;
      const vein = Math.max(mid, lateral);
      height[i] = vein * 0.8 + (n[i] ?? 0) * 0.2;
      field[i] = 0.35 + (n[i] ?? 0) * 0.45 + vein * 0.25 - Math.abs(u) * 0.2;
    }
  }
  const rough = new Float32Array(size * size);
  for (let i = 0; i < rough.length; i++) rough[i] = 0.42 + (n[i] ?? 0) * 0.2;
  return {
    map: paletteTexture(field, size, [
      [0.2, "#1f4214"],
      [0.5, "#3c7424"],
      [0.8, "#6fa043"],
    ]),
    normalMap: normalFromHeight(height, size, 2.2),
    roughnessMap: greyTexture(rough, size),
  };
}

/** Matte expanded-foam or paper with fine fibre noise. */
export function matteMaps(
  light: string,
  dark: string,
  size = 128,
  seed = 51,
): SurfaceMaps {
  const n = fbm(size, seed, 5, 16);
  const rough = new Float32Array(size * size).fill(0.85);
  return {
    map: paletteTexture(n, size, [
      [0.3, dark],
      [0.7, light],
    ]),
    normalMap: normalFromHeight(n, size, 0.8),
    roughnessMap: greyTexture(rough, size),
  };
}

/** Wood grain for the hanging sign. */
export function woodMaps(size = 256, seed = 61): SurfaceMaps {
  const n = fbm(size, seed, 5, 4);
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      field[i] =
        0.5 +
        0.5 * Math.sin((y / size) * 60 + (n[i] ?? 0) * 12) * 0.6 * (n[i] ?? 0);
    }
  }
  const rough = new Float32Array(size * size);
  for (let i = 0; i < rough.length; i++) rough[i] = 0.5 + (field[i] ?? 0) * 0.3;
  return {
    map: paletteTexture(field, size, [
      [0.3, "#2b1a10"],
      [0.6, "#4a2e1b"],
      [0.85, "#6b452a"],
    ]),
    normalMap: normalFromHeight(field, size, 1.5),
    roughnessMap: greyTexture(rough, size),
  };
}
