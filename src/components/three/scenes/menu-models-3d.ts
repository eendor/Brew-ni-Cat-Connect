import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import type {
  DrinkLook,
  FriesSeasoning,
  ModelPart,
  ModelSpec,
  NoodleStyle,
  TakoyakiTopping,
} from "../menu-models";
import {
  canvasTexture,
  context2d,
  disposeScene,
  photoTexture,
} from "../engine/renderer";
import { smooth } from "../engine/runtime";
import { fryMaps, matteMaps, rng } from "../engine/textures";
import {
  CUP_H,
  Y0,
  cupR,
  displace,
  makeBuldak,
  makeCup,
  makeFries,
  makeTakoyaki,
} from "./models";

/**
 * Builders for the Menu 3D viewer: one model per menu item, shaped by the
 * picked size and flavor (see `modelSpecFor` in ../menu-models).
 *
 * Every model is a Group whose userData follows one contract:
 * - `spin`: the object(s) the viewer turns about their own up axis
 *   (the model itself when unset);
 * - `update(dt, time)`: optional per-frame animation (bubbles, the box lid);
 * - `fit`: optional reference size of the item's largest option, so a
 *   smaller size also looks smaller in the viewer.
 */

export type ModelUpdate = (dt: number, time: number) => void;

type Rgb = readonly [number, number, number];
type Scale = number | readonly [number, number, number];

const STICKER = "/three/cat-sticker.png";
const LIQUID_TOP = Y0 + 0.09 + CUP_H * 0.9;
const CUP_RIM = Y0 + CUP_H;
const UP = new THREE.Vector3(0, 1, 0);

const repeat = (texture: THREE.Texture | undefined, x: number, y: number) => {
  if (texture) texture.repeat.set(x, y);
};

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scaleVector = new THREE.Vector3();

/** Places one instance from a position, a rotation and a scale. */
function placeInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3,
  rotation: readonly [number, number, number] | THREE.Quaternion,
  scale: Scale = 1,
) {
  const [sx, sy, sz] =
    typeof scale === "number" ? ([scale, scale, scale] as const) : scale;
  if (rotation instanceof THREE.Quaternion) quaternion.copy(rotation);
  else {
    quaternion.setFromEuler(euler.set(rotation[0], rotation[1], rotation[2]));
  }
  matrix.compose(position, quaternion, scaleVector.set(sx, sy, sz));
  mesh.setMatrixAt(index, matrix);
}

/** Rotation that stands a piece's local up on `normal`, turned by `turn`. */
function standOn(normal: THREE.Vector3, turn: number) {
  return new THREE.Quaternion()
    .setFromUnitVectors(UP, normal)
    .multiply(new THREE.Quaternion().setFromAxisAngle(UP, turn));
}

/** Objects the viewer spins: `userData.spin`, or the model itself. */
export function spinTargets(model: THREE.Object3D): THREE.Object3D[] {
  const spin = model.userData.spin as
    THREE.Object3D | THREE.Object3D[] | undefined;
  if (Array.isArray(spin)) return spin;
  return spin ? [spin] : [model];
}

/**
 * Bounds of the model over a full turn, so it stays in frame and on the
 * floor while it spins. Measure before adding the model to a parent.
 */
export function sweptBox(model: THREE.Object3D, steps = 8) {
  const targets = spinTargets(model);
  const saved = targets.map((target) => target.rotation.y);
  const box = new THREE.Box3();
  const step = new THREE.Box3();
  for (let i = 0; i < steps; i++) {
    targets.forEach((target, index) => {
      target.rotation.y = (saved[index] ?? 0) + (i / steps) * Math.PI * 2;
    });
    box.union(step.setFromObject(model));
  }
  targets.forEach((target, index) => {
    target.rotation.y = saved[index] ?? 0;
  });
  model.updateMatrixWorld(true);
  return box;
}

/** Frees a model's GPU memory, instanced meshes included. */
export function disposeModel(model: THREE.Object3D) {
  model.removeFromParent();
  model.traverse((object) => {
    if ((object as THREE.InstancedMesh).isInstancedMesh) {
      (object as THREE.InstancedMesh).dispose();
    }
  });
  disposeScene(model);
}

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

function rgb(hex: string): Rgb {
  const value = new THREE.Color(hex).getHex(THREE.SRGBColorSpace);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const WHITE: Rgb = [255, 255, 255];

/** sRGB color at fraction `f` of bottom-to-top stops, eased between stops. */
function stopColor(
  stops: ReadonlyArray<readonly [number, Rgb]>,
  f: number,
): Rgb {
  const first = stops[0];
  if (!first) return WHITE;
  if (f <= first[0]) return first[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (a && b && f <= b[0]) {
      const t = smooth(a[0], b[0], f);
      return [
        a[1][0] + (b[1][0] - a[1][0]) * t,
        a[1][1] + (b[1][1] - a[1][1]) * t,
        a[1][2] + (b[1][2] - a[1][2]) * t,
      ];
    }
  }
  return stops[stops.length - 1]?.[1] ?? WHITE;
}

/**
 * Closed outline of a rounded rectangle in the XZ plane. Growing every
 * size by the same offset keeps the corner centers fixed, so outlines at
 * different offsets have matching points and can be stitched together.
 */
function roundedRectOutline(
  halfWidth: number,
  halfDepth: number,
  radius: number,
  cornerSegments = 6,
  edgeSegments = 6,
) {
  const points: THREE.Vector2[] = [];
  const r = Math.max(radius, 0);
  const cx = halfWidth - radius;
  const cz = halfDepth - radius;
  const corners: ReadonlyArray<readonly [number, number]> = [
    [cx, cz],
    [-cx, cz],
    [-cx, -cz],
    [cx, -cz],
  ];
  corners.forEach(([x, z], corner) => {
    const start = (corner * Math.PI) / 2;
    for (let i = 0; i <= cornerSegments; i++) {
      const a = start + (i / cornerSegments) * (Math.PI / 2);
      points.push(new THREE.Vector2(x + Math.cos(a) * r, z + Math.sin(a) * r));
    }
    // straight edge to the next corner
    const [nx, nz] = corners[(corner + 1) % 4] ?? [x, z];
    const end = start + Math.PI / 2;
    const ex = x + Math.cos(end) * r;
    const ez = z + Math.sin(end) * r;
    const sx = nx + Math.cos(end) * r;
    const sz = nz + Math.sin(end) * r;
    for (let i = 1; i < edgeSegments; i++) {
      const t = i / edgeSegments;
      points.push(new THREE.Vector2(ex + (sx - ex) * t, ez + (sz - ez) * t));
    }
  });
  return points;
}

/** How far a ring sits outside the base outline, and at what height. */
type Ring = readonly [offset: number, y: number];

/** A wall swept around a rounded rectangle through bottom-to-top rings. */
function roundedRectSweep(
  rings: ReadonlyArray<Ring>,
  halfWidth: number,
  halfDepth: number,
  radius: number,
) {
  const outlines = rings.map(([offset]) =>
    roundedRectOutline(halfWidth + offset, halfDepth + offset, radius + offset),
  );
  const n = outlines[0]?.length ?? 0;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  outlines.forEach((outline, j) => {
    const y = rings[j]?.[1] ?? 0;
    for (let k = 0; k <= n; k++) {
      const p = outline[k % n] ?? new THREE.Vector2();
      positions.push(p.x, y, p.y);
      uvs.push(k / n, j / Math.max(1, rings.length - 1));
    }
  });
  for (let j = 0; j < rings.length - 1; j++) {
    for (let k = 0; k < n; k++) {
      const a = j * (n + 1) + k;
      const b = a + 1;
      const c = a + n + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A rounded-rectangle cap at height `y`, domed up by `dome` in the middle. */
function roundedRectCap(
  halfWidth: number,
  halfDepth: number,
  radius: number,
  y: number,
  dome = 0,
  steps = 8,
) {
  const outline = roundedRectOutline(halfWidth, halfDepth, radius);
  const n = outline.length;
  const positions: number[] = [0, y + dome, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    for (let k = 0; k < n; k++) {
      const p = outline[k] ?? new THREE.Vector2();
      positions.push(p.x * t, y + dome * (1 - t * t), p.y * t);
      uvs.push(
        0.5 + (p.x * t) / (2 * halfWidth),
        0.5 - (p.y * t) / (2 * halfDepth),
      );
    }
  }
  for (let k = 0; k < n; k++) {
    indices.push(0, 1 + ((k + 1) % n), 1 + k);
  }
  for (let s = 1; s < steps; s++) {
    const ring = 1 + (s - 1) * n;
    const next = ring + n;
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      indices.push(ring + k, ring + k1, next + k);
      indices.push(ring + k1, next + k1, next + k);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The top half of a unit sphere, for heaps that fill a container. */
function heapGeometry(seed: number, bumps: number) {
  return displace(
    new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    bumps,
    seed,
    3,
  );
}

/** Merges geometries (all indexed, same attributes) and frees the parts. */
function merge(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error("Could not merge model geometry");
  return merged;
}

/** Tilts toward the camera once; the viewer spins `inner` on its own axis. */
function tilted(inner: THREE.Object3D, tilt: number) {
  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.x = tilt;
  tiltGroup.add(inner);
  const wrap = new THREE.Group();
  wrap.add(tiltGroup);
  wrap.userData.spin = inner;
  return wrap;
}

/** Runs every update in `updates` as one. */
function combined(updates: ReadonlyArray<ModelUpdate>): ModelUpdate {
  return (dt, time) => {
    for (const update of updates) update(dt, time);
  };
}

/* ------------------------------------------------------------------ */
/* Iced drinks                                                         */
/* ------------------------------------------------------------------ */

/**
 * Paints the drink onto the liquid's lathe UVs: v runs bottom center
 * (0) → side (1/38…37/38) → top center (1), u runs around the cup, so
 * everything drawn wraps horizontally to avoid a seam.
 */
function drinkTexture(drink: DrinkLook, mobile: boolean) {
  const width = mobile ? 256 : 512;
  const height = mobile ? 512 : 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = context2d(canvas);
  const image = g.createImageData(width, height);
  const data = image.data;
  const random = rng(19);

  // layer colors by side fraction (-0.1…1.1), looked up per pixel
  const stops = drink.layers.map(([f, hex]) => [f, rgb(hex)] as const);
  const steps = 1024;
  const lut = new Float32Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    lut.set(stopColor(stops, -0.1 + (i / (steps - 1)) * 1.2), i * 3);
  }
  // soft, uneven layer boundaries in whole periods, so the seam tiles
  const wobble = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const u = (x / width) * Math.PI * 2;
    wobble[x] = Math.sin(u * 3 + 1.3) * 0.012 + Math.sin(u * 7 + 0.4) * 0.007;
  }
  const surface = rgb(drink.surface);
  const bottom = stops[0]?.[1] ?? surface;
  const capTop = height / 38;
  const capBottom = (height * 37) / 38;
  for (let row = 0; row < height; row++) {
    const side = (38 * (1 - (row + 0.5) / height) - 1) / 36;
    for (let x = 0; x < width; x++) {
      const index = (row * width + x) * 4;
      const noise = (random() - 0.5) * 8;
      if (row < capTop || row >= capBottom) {
        const color = row < capTop ? surface : bottom;
        data[index] = color[0] + noise;
        data[index + 1] = color[1] + noise;
        data[index + 2] = color[2] + noise;
      } else {
        const f = side + (wobble[x] ?? 0);
        const at =
          Math.min(
            steps - 1,
            Math.max(0, Math.round(((f + 0.1) / 1.2) * (steps - 1))),
          ) * 3;
        data[index] = (lut[at] ?? 0) + noise;
        data[index + 1] = (lut[at + 1] ?? 0) + noise;
        data[index + 2] = (lut[at + 2] ?? 0) + noise;
      }
      data[index + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);

  // A pixel across the cup is ~3× a pixel up it, so specks drawn 3× taller
  // than wide come out round.
  const speck = (x: number, y: number, rx: number, fill: string) => {
    g.fillStyle = fill;
    const tilt = (random() - 0.5) * 0.6;
    for (const dx of [-width, 0, width]) {
      if (x + dx + rx < 0 || x + dx - rx > width) continue;
      g.beginPath();
      g.ellipse(x + dx, y, rx, rx * 3.04, tilt, 0, Math.PI * 2);
      g.fill();
    }
  };
  const sideRow = (f: number) => (1 - (1 + 36 * f) / 38) * height;
  const px = width / 512;

  if (drink.cookieBase) {
    // crushed cookie at the bottom: dark chunks with a few cream bits
    for (let i = 0; i < (mobile ? 160 : 320); i++) {
      const pick = random();
      speck(
        random() * width,
        sideRow(Math.pow(random(), 1.6) * 0.17),
        (2 + random() * 5) * px,
        pick < 0.2 ? "#d9cdb8" : pick < 0.6 ? "#1c1310" : "#3e2c22",
      );
    }
  }
  if (drink.speckles) {
    // cookie specks blended through the shake
    g.globalAlpha = 0.85;
    for (let i = 0; i < (mobile ? 700 : 1400); i++) {
      speck(
        random() * width,
        sideRow(0.16 + random() * 0.84),
        (0.6 + random() * 1.8) * px,
        drink.speckles,
      );
    }
    g.globalAlpha = 1;
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Caramel drizzled around the rim and running down the inside walls. */
function drizzleTexture(color: string, mobile: boolean) {
  const width = mobile ? 512 : 1024;
  const height = mobile ? 256 : 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = context2d(canvas);
  const random = rng(37);
  const s = width / 1024;
  g.fillStyle = color;
  // wavy band just under the rim
  g.beginPath();
  g.moveTo(0, 0);
  for (let x = 0; x <= width; x += 4) {
    const u = (x / width) * Math.PI * 2;
    g.lineTo(
      x,
      height * (0.1 + 0.03 * Math.sin(u * 5) + 0.02 * Math.sin(u * 11 + 1)),
    );
  }
  g.lineTo(width, 0);
  g.closePath();
  g.fill();
  // streaks running down from the band, thinning as they go
  const streaks = 11;
  for (let i = 0; i < streaks; i++) {
    const x0 = ((i + random() * 0.6) / streaks) * width;
    const length = height * (0.35 + random() * 0.55);
    const drift = (random() - 0.5) * 40 * s;
    const thick = (9 + random() * 8) * s;
    for (const dx of [-width, 0, width]) {
      let x = x0 + dx;
      for (let y = height * 0.08; y < length; y += 3) {
        x += (drift / length) * 3;
        g.beginPath();
        g.ellipse(x, y, thick * (1 - (y / length) * 0.6), 4, 0, 0, Math.PI * 2);
        g.fill();
      }
      // a drip gathers at the end
      g.beginPath();
      g.ellipse(x, length, thick * 0.75, thick * 0.55, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

async function buildCup(
  part: Extract<ModelPart, { kind: "cup" }>,
  mobile: boolean,
) {
  const { drink } = part;
  const cup = await makeCup(STICKER, { lid: drink.flatLid ? "flat" : "dome" });
  const map = drinkTexture(drink, mobile);
  const previous = cup.liquid.material as THREE.Material;
  // opaque, so it still shows through the cup's transmission pass
  cup.liquid.material = drink.milky
    ? new THREE.MeshPhysicalMaterial({
        map,
        roughness: 0.32,
        clearcoat: 0.25,
        clearcoatRoughness: 0.25,
        sheen: 0.6,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color("#fff6e6"),
        envMapIntensity: 0.6,
      })
    : new THREE.MeshPhysicalMaterial({
        map,
        emissiveMap: map,
        emissive: "#ffffff",
        emissiveIntensity: 0.12,
        roughness: 0.12,
        clearcoat: 0.8,
        clearcoatRoughness: 0.08,
        envMapIntensity: 0.9,
      });
  previous.dispose();

  const updates: ModelUpdate[] = [];
  const random = rng(53);

  if (drink.drizzle) {
    const top = CUP_RIM - 0.08;
    const bottom = Y0 + 0.25;
    // between the liquid (r - 0.04) and the inside of the wall (r - 0.025)
    const drizzle = new THREE.Mesh(
      new THREE.CylinderGeometry(
        cupR(top) - 0.03,
        cupR(bottom) - 0.03,
        top - bottom,
        96,
        1,
        true,
      ),
      new THREE.MeshPhysicalMaterial({
        map: drizzleTexture(drink.drizzle, mobile),
        alphaTest: 0.5,
        roughness: 0.22,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
      }),
    );
    drizzle.position.y = (top + bottom) / 2;
    cup.group.add(drizzle);
  }

  if (drink.crumbs) {
    // cookie crumbs floating on top
    const count = mobile ? 40 : 80;
    const crumbs = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.05),
      new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
      count,
    );
    const dark = new THREE.Color("#2b1e18");
    const cream = new THREE.Color("#e6dccb");
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * 0.72;
      placeInstance(
        crumbs,
        i,
        new THREE.Vector3(
          Math.cos(a) * r,
          LIQUID_TOP + 0.01 + random() * 0.03,
          Math.sin(a) * r,
        ),
        [random() * 3, random() * 3, random() * 3],
        [0.6 + random() * 0.9, 0.4 + random() * 0.4, 0.6 + random() * 0.9],
      );
      crumbs.setColorAt(i, random() < 0.15 ? cream : dark);
    }
    cup.group.add(crumbs);
  }

  if (drink.bubbles) {
    // fizz clinging to the cup and rising
    const count = mobile ? 36 : 72;
    const bubbles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        roughness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.5,
        emissive: drink.surface,
        emissiveIntensity: 0.25,
      }),
      count,
    );
    bubbles.frustumCulled = false;
    const low = Y0 + 0.2;
    const high = LIQUID_TOP - 0.05;
    const state = Array.from({ length: count }, () => ({
      a: random() * Math.PI * 2,
      y: low + random() * (high - low),
      speed: 0.12 + random() * 0.23,
      size: 0.01 + random() * 0.008,
    }));
    const position = new THREE.Vector3();
    const place = () => {
      state.forEach((bubble, i) => {
        const r = cupR(bubble.y) - 0.043;
        position.set(Math.cos(bubble.a) * r, bubble.y, Math.sin(bubble.a) * r);
        placeInstance(bubbles, i, position, [0, 0, 0], bubble.size);
      });
      bubbles.instanceMatrix.needsUpdate = true;
    };
    place();
    updates.push((dt) => {
      for (const bubble of state) {
        bubble.y += bubble.speed * dt;
        if (bubble.y > high) {
          bubble.y = low;
          bubble.a = random() * Math.PI * 2;
        }
      }
      place();
    });
    cup.group.add(bubbles);
  }

  // stays upright: a cup reads best straight on
  const root = new THREE.Group();
  cup.group.scale.setScalar(part.scale);
  root.add(cup.group);
  root.userData.spin = cup.group;
  if (updates.length > 0) root.userData.update = combined(updates);
  // sized against the largest (22oz) cup, so a 12oz looks smaller
  root.userData.fit = sweptBox(root)
    .getSize(new THREE.Vector3())
    .multiplyScalar(1.18 / part.scale);
  return root;
}

/* ------------------------------------------------------------------ */
/* Takoyaki                                                            */
/* ------------------------------------------------------------------ */

const takoyakiLayouts = {
  4: [2, 2],
  8: [2, 4],
  12: [3, 4],
  16: [4, 4],
} as const;

/** Swept size of the 16-piece tray, from boxes where its parts sit. */
function takoyakiReference() {
  const [rows, cols] = takoyakiLayouts[16];
  const width = cols * 0.82 + 0.24;
  const depth = rows * 0.82 + 0.26;
  const inner = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.42, depth));
  const lid = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, depth));
  lid.geometry.translate(0, 0, -depth / 2);
  lid.position.set(0, 0.22, -(depth / 2 - 0.03));
  lid.rotation.x = 1.85;
  const balls = new THREE.Mesh(
    new THREE.BoxGeometry(cols * 0.82 + 0.08, 0.95, rows * 0.82 + 0.08),
  );
  balls.position.y = 0.6;
  inner.add(base, lid, balls);
  inner.rotation.x = 0.5;
  inner.position.y = -0.3;
  const wrap = new THREE.Group();
  wrap.add(inner);
  wrap.userData.spin = inner;
  const size = sweptBox(wrap).getSize(new THREE.Vector3());
  disposeScene(wrap);
  return size;
}

/** A point just above a ball's sauce and mayo, with the surface normal. */
function onBall(
  top: THREE.Vector3,
  random: () => number,
  spread: number,
  lift = 0,
) {
  const a = random() * Math.PI * 2;
  const r = Math.sqrt(random()) * spread;
  const dx = Math.cos(a) * r;
  const dz = Math.sin(a) * r;
  const radius = 0.44 + lift;
  const height = Math.sqrt(Math.max(0, radius * radius - r * r)) * 0.88;
  return {
    position: new THREE.Vector3(top.x + dx, top.y - 0.34 + height, top.z + dz),
    normal: new THREE.Vector3(dx, height, dz).normalize(),
  };
}

/** A torus lying flat (hole facing up), for rings and curled pieces. */
function flatTorus(
  radius: number,
  tube: number,
  radial: number,
  tubular: number,
  arc = Math.PI * 2,
) {
  return new THREE.TorusGeometry(radius, tube, radial, tubular, arc).rotateX(
    -Math.PI / 2,
  );
}

function takoyakiTopping(
  inner: THREE.Object3D,
  tops: ReadonlyArray<THREE.Vector3>,
  topping: TakoyakiTopping,
  mobile: boolean,
) {
  const random = rng(911);
  const few = mobile ? 0.6 : 1;
  if (topping === "veggie") {
    // scallion rings and carrot bits
    const ringCount = Math.round(tops.length * 5 * few);
    const rings = new THREE.InstancedMesh(
      flatTorus(0.035, 0.012, 6, 14),
      new THREE.MeshPhysicalMaterial({
        color: "#6fae3e",
        roughness: 0.45,
        clearcoat: 0.4,
        sheen: 0.4,
        sheenColor: new THREE.Color("#d8f5b0"),
      }),
      ringCount,
    );
    for (let i = 0; i < ringCount; i++) {
      const top = tops[i % tops.length];
      if (!top) continue;
      const { position, normal } = onBall(top, random, 0.24, 0.015);
      placeInstance(rings, i, position, standOn(normal, random() * 3));
    }
    const bitCount = Math.round(tops.length * 3 * few);
    const bits = new THREE.InstancedMesh(
      new RoundedBoxGeometry(0.05, 0.05, 0.05, 2, 0.012),
      new THREE.MeshPhysicalMaterial({ color: "#f07a24", roughness: 0.4 }),
      bitCount,
    );
    for (let i = 0; i < bitCount; i++) {
      const top = tops[(i * 7) % tops.length];
      if (!top) continue;
      const { position } = onBall(top, random, 0.22, 0.02);
      placeInstance(bits, i, position, [random() * 3, random() * 3, 0]);
    }
    inner.add(rings, bits);
    return;
  }
  if (topping === "cheese") {
    // a cheese sauce zigzag across each ball, plus cheese bits
    const tubes = tops.map((top, index) => {
      const turn = random() * Math.PI;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const along = (t - 0.5) * 0.52;
        const across = Math.sin(t * Math.PI * 4 + index) * 0.15;
        const x = along * Math.cos(turn) - across * Math.sin(turn);
        const z = along * Math.sin(turn) + across * Math.cos(turn);
        const y = Math.sqrt(Math.max(0, 0.445 ** 2 - x * x - z * z)) * 0.88;
        points.push(new THREE.Vector3(top.x + x, top.y - 0.34 + y, top.z + z));
      }
      return new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        64,
        0.03,
        8,
        false,
      );
    });
    inner.add(
      new THREE.Mesh(
        merge(tubes),
        new THREE.MeshPhysicalMaterial({
          color: "#f6c033",
          roughness: 0.25,
          clearcoat: 0.8,
          sheen: 0.4,
          sheenColor: new THREE.Color("#fff0a8"),
        }),
      ),
    );
    const bitCount = Math.round(tops.length * 4 * few);
    const bits = new THREE.InstancedMesh(
      new RoundedBoxGeometry(0.06, 0.04, 0.06, 2, 0.012),
      new THREE.MeshPhysicalMaterial({
        color: "#ffd84a",
        roughness: 0.5,
        sheen: 0.4,
        sheenColor: new THREE.Color("#fff3b0"),
      }),
      bitCount,
    );
    for (let i = 0; i < bitCount; i++) {
      const top = tops[i % tops.length];
      if (!top) continue;
      const { position, normal } = onBall(top, random, 0.25, 0.02);
      placeInstance(bits, i, position, standOn(normal, random() * 3));
    }
    inner.add(bits);
    return;
  }
  // squid: pale curled tentacle pieces; shrimp: one curled shrimp per ball
  const squid = topping === "squid";
  const count = squid ? tops.length * 2 : tops.length;
  const pieces = new THREE.InstancedMesh(
    squid
      ? flatTorus(0.06, 0.018, 8, 18, Math.PI * 1.2)
      : flatTorus(0.075, 0.032, 10, 22, Math.PI * 1.3),
    new THREE.MeshPhysicalMaterial({
      color: squid ? "#efd3d6" : "#f38a5c",
      roughness: 0.35,
      clearcoat: 0.6,
      sheen: 0.5,
      sheenColor: new THREE.Color(squid ? "#fff0f4" : "#ffd2b8"),
    }),
    count,
  );
  for (let i = 0; i < count; i++) {
    const top = tops[i % tops.length];
    if (!top) continue;
    const { position, normal } = onBall(top, random, squid ? 0.18 : 0.05, 0.03);
    placeInstance(pieces, i, position, standOn(normal, random() * 6));
  }
  inner.add(pieces);
}

let takoyakiFit: THREE.Vector3 | null = null;

function buildTakoyaki(
  part: Extract<ModelPart, { kind: "takoyaki" }>,
  mobile: boolean,
) {
  const [rows, cols] = takoyakiLayouts[part.count];
  const wrap = makeTakoyaki(mobile, { rows, cols });
  const inner = wrap.userData.spin as THREE.Object3D;
  const tops = wrap.userData.tops as THREE.Vector3[];
  if (part.topping) takoyakiTopping(inner, tops, part.topping, mobile);
  // sized against the 16-piece tray, so 4 pieces look smaller
  takoyakiFit ??= takoyakiReference();
  wrap.userData.fit = takoyakiFit.clone();
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Fries                                                               */
/* ------------------------------------------------------------------ */

const friesSizes = {
  small: [0.8, 20],
  medium: [0.9, 28],
  large: [1, 38],
  jumbo: [1.15, 50],
} as const;

const seasonings: Record<
  FriesSeasoning,
  Readonly<{ tint: string; flecks: readonly string[] }>
> = {
  bbq: { tint: "#ffc49a", flecks: ["#7a2a12", "#a8441c"] },
  cheese: { tint: "#ffe28a", flecks: ["#f6a623", "#ffcf40"] },
  "sour-cream": { tint: "#fff6e8", flecks: ["#f8f5ec", "#6c8f3a"] },
  spicy: { tint: "#ff9f86", flecks: ["#c0281a", "#5a1208"] },
};

/** Seasoning: tints the fries and sticks flecks on their upper halves. */
function seasonFries(
  inner: THREE.Object3D,
  fry: THREE.InstancedMesh,
  seasoning: FriesSeasoning,
  mobile: boolean,
) {
  const { tint, flecks } = seasonings[seasoning];
  const tintColor = new THREE.Color(tint);
  const color = new THREE.Color();
  for (let i = 0; i < fry.count; i++) {
    fry.getColorAt(i, color);
    fry.setColorAt(i, color.multiply(tintColor));
  }
  if (fry.instanceColor) fry.instanceColor.needsUpdate = true;

  const random = rng(271);
  const count = Math.round(fry.count * (mobile ? 5 : 8));
  const fleck = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.028, 0.028, 0.006),
    new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    count,
  );
  const shades = flecks.map((hex) => new THREE.Color(hex));
  const fryMatrix = new THREE.Matrix4();
  const onFry = new THREE.Matrix4();
  const local = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    fry.getMatrixAt(Math.floor(random() * fry.count), fryMatrix);
    // flat against one of the four long faces (the fry is 0.12 thick and
    // bumpy, so 0.068 out keeps most flecks just above the surface)
    const face = Math.floor(random() * 4);
    const along = 0.05 + random() * 0.65;
    const across = (random() - 0.5) * 0.09;
    const out = face % 2 === 0 ? 0.068 : -0.068;
    if (face < 2) local.set(out, along, across);
    else local.set(across, along, out);
    onFry.makeRotationY(face < 2 ? Math.PI / 2 : 0);
    onFry.setPosition(local);
    fleck.setMatrixAt(i, onFry.premultiply(fryMatrix));
    fleck.setColorAt(i, shades[i % shades.length] ?? tintColor);
  }
  inner.add(fleck);
}

function buildFries(
  part: Extract<ModelPart, { kind: "fries" }>,
  mobile: boolean,
) {
  const [scale, baseCount] = friesSizes[part.size];
  const wrap = makeFries(mobile, Math.round(baseCount * (mobile ? 0.7 : 1)));
  const inner = wrap.children[0] ?? wrap;
  const fry = wrap.userData.fries as THREE.InstancedMesh;
  if (part.seasoning) seasonFries(inner, fry, part.seasoning, mobile);
  wrap.scale.setScalar(scale);
  wrap.userData.spin = inner;
  // sized against the jumbo cone, so a small looks smaller
  wrap.userData.fit = sweptBox(wrap)
    .getSize(new THREE.Vector3())
    .multiplyScalar(friesSizes.jumbo[0] / scale);
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Noodles                                                             */
/* ------------------------------------------------------------------ */

const sauces: Record<NoodleStyle, readonly [string, string]> = {
  carbo: ["#f2a77a", "#d0683e"],
  cheese: ["#f3b54e", "#cf7a2a"],
  sedaap: ["#b9773a", "#6e3d17"],
  "sedaap-spicy": ["#de6a3c", "#8f2c14"],
};

function noodleSauce(part: Extract<ModelPart, { kind: "noodles" }>) {
  const [base, dark] = sauces[part.style];
  const a = new THREE.Color(base);
  const b = new THREE.Color(dark);
  if (part.style === "sedaap-spicy") {
    // more paws, deeper red
    const t = Math.min(1, Math.max(0, (part.heat - 1) / 2));
    a.lerp(new THREE.Color("#c22a16"), t);
    b.lerp(new THREE.Color("#5e0f08"), t);
  }
  if (part.milk) {
    // milk makes the sauce creamier and paler
    const milk = new THREE.Color("#f6e7d2");
    a.lerp(milk, 0.35);
    b.lerp(milk, 0.3);
  }
  return [
    `#${a.getHexString(THREE.SRGBColorSpace)}`,
    `#${b.getHexString(THREE.SRGBColorSpace)}`,
  ] as [string, string];
}

/** A spot on top of the noodles in the bowl. */
function overNoodles(random: () => number) {
  const a = random() * Math.PI * 2;
  const r = 0.1 + Math.sqrt(random()) * 1.0;
  return new THREE.Vector3(
    Math.cos(a) * r,
    0.36 - 0.1 * r + random() * 0.04,
    Math.sin(a) * r,
  );
}

function buildNoodles(
  part: Extract<ModelPart, { kind: "noodles" }>,
  mobile: boolean,
) {
  const wrap = makeBuldak(mobile, {
    sauce: noodleSauce(part),
    egg: part.egg,
    seaweed: part.style === "carbo" || part.style === "cheese",
  });
  const inner = wrap.userData.spin as THREE.Object3D;
  const random = rng(613);
  const few = mobile ? 0.6 : 1;
  const scatter = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number,
    { scale = 1, flat = false }: { scale?: Scale; flat?: boolean } = {},
  ) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i++) {
      // flat pieces (drawn in the XY plane) lie down with a random heading
      const rotation = flat
        ? ([
            -Math.PI / 2 + (random() - 0.5) * 0.7,
            (random() - 0.5) * 0.7,
            random() * 6,
          ] as const)
        : ([random() * 3, random() * 3, random() * 3] as const);
      placeInstance(mesh, i, overNoodles(random), rotation, scale);
    }
    inner.add(mesh);
  };

  if (part.style === "cheese") {
    scatter(
      new RoundedBoxGeometry(0.08, 0.05, 0.08, 2, 0.015),
      new THREE.MeshPhysicalMaterial({
        color: "#ffd23f",
        roughness: 0.4,
        sheen: 0.5,
        sheenColor: new THREE.Color("#fff3b0"),
      }),
      Math.round(30 * few),
    );
  }
  if (part.style === "sedaap" || part.style === "sedaap-spicy") {
    // fried shallots and scallion rings
    const flake = new THREE.PlaneGeometry(0.09, 0.05, 3, 1);
    const position = flake.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      position.setZ(i, x * x * 4);
    }
    flake.computeVertexNormals();
    scatter(
      flake,
      new THREE.MeshPhysicalMaterial({
        color: "#a8642a",
        roughness: 0.55,
        side: THREE.DoubleSide,
        sheen: 0.4,
        sheenColor: new THREE.Color("#f2b36a"),
      }),
      Math.round(40 * few),
      { flat: true },
    );
    scatter(
      new THREE.TorusGeometry(0.045, 0.014, 6, 14),
      new THREE.MeshPhysicalMaterial({
        color: "#6aa84f",
        roughness: 0.45,
        clearcoat: 0.3,
      }),
      Math.round(18 * few),
      { flat: true },
    );
  }
  if (part.style === "sedaap-spicy") {
    // chili flakes by heat, plus sesame seeds
    scatter(
      new THREE.CircleGeometry(0.03, 5),
      new THREE.MeshPhysicalMaterial({
        color: "#b3170c",
        roughness: 0.4,
        clearcoat: 0.5,
        side: THREE.DoubleSide,
      }),
      Math.round(14 * Math.max(1, part.heat) * few),
      { flat: true },
    );
    scatter(
      new THREE.SphereGeometry(0.018, 8, 6),
      new THREE.MeshPhysicalMaterial({ color: "#f1e4c8", roughness: 0.5 }),
      Math.round(30 * few),
      { scale: [1, 0.55, 1.6] },
    );
  }
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Nachos in a kraft paper boat                                        */
/* ------------------------------------------------------------------ */

/** A rounded, slightly cupped triangle, like a tortilla chip. */
function chipGeometry() {
  const corners = [0, 1, 2].map((i) => {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    return new THREE.Vector2(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
  });
  const shape = new THREE.Shape();
  corners.forEach((corner, i) => {
    const next = corners[(i + 1) % 3] ?? corner;
    const prev = corners[(i + 2) % 3] ?? corner;
    const from = corner.clone().lerp(prev, 0.12);
    const to = corner.clone().lerp(next, 0.12);
    if (i === 0) shape.moveTo(from.x, from.y);
    else shape.lineTo(from.x, from.y);
    shape.quadraticCurveTo(corner.x, corner.y, to.x, to.y);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 6);
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, -(x * x + y * y) * 0.6);
    uv.setXY(i, x + 0.5, y + 0.5);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function buildNachos(
  part: Extract<ModelPart, { kind: "nachos" }>,
  mobile: boolean,
) {
  const inner = new THREE.Group();
  const halfWidth = 1.25;
  const halfDepth = 0.85;
  const radius = 0.35;
  const kraft = matteMaps("#c99c69", "#9c7244", 128, 83);
  repeat(kraft.map, 4, 1);
  repeat(kraft.normalMap, 4, 1);
  const boat = new THREE.Mesh(
    merge([
      roundedRectSweep(
        [
          [0, 0],
          [0.04, 0.2],
          [0.09, 0.4],
          [0.14, 0.6],
          [0.17, 0.7],
          [0.2, 0.72],
          [0.21, 0.69],
        ],
        halfWidth,
        halfDepth,
        radius,
      ),
      roundedRectCap(halfWidth, halfDepth, radius, 0.001),
    ]),
    new THREE.MeshPhysicalMaterial({
      map: kraft.map,
      normalMap: kraft.normalMap,
      roughness: 0.9,
      side: THREE.DoubleSide,
      sheen: 0.3,
      sheenColor: new THREE.Color("#f3d9b5"),
    }),
  );
  boat.castShadow = true;
  boat.receiveShadow = true;
  inner.add(boat);

  // a bed of broken chips fills the boat, so no paper shows between chips
  const chipMaps = matteMaps("#f4c65a", "#d9952a", 128, 89);
  const bedX = halfWidth - 0.12;
  const bedZ = halfDepth - 0.1;
  const bedHeight = 0.6;
  const bed = new THREE.Mesh(
    heapGeometry(719, 0.05),
    new THREE.MeshPhysicalMaterial({
      map: chipMaps.map,
      normalMap: chipMaps.normalMap,
      color: "#d9a640",
      roughness: 0.75,
    }),
  );
  bed.scale.set(bedX, bedHeight, bedZ);
  bed.position.y = 0.02;
  inner.add(bed);
  const heap = (x: number, z: number) =>
    0.02 +
    bedHeight * Math.sqrt(Math.max(0, 1 - (x / bedX) ** 2 - (z / bedZ) ** 2));

  const random = rng(709);
  const chipCount = mobile ? 20 : 30;
  const chips = new THREE.InstancedMesh(
    chipGeometry(),
    new THREE.MeshPhysicalMaterial({
      map: chipMaps.map,
      normalMap: chipMaps.normalMap,
      roughness: 0.6,
      side: THREE.DoubleSide,
      sheen: 0.3,
      sheenColor: new THREE.Color("#ffe3a0"),
    }),
    chipCount,
  );
  chips.castShadow = true;
  const color = new THREE.Color();
  for (let i = 0; i < chipCount; i++) {
    const x = (random() - 0.5) * 2 * (halfWidth - 0.45);
    const z = (random() - 0.5) * 2 * (halfDepth - 0.38);
    placeInstance(
      chips,
      i,
      new THREE.Vector3(x, heap(x, z) + 0.04 + random() * 0.08, z),
      [
        -Math.PI / 2 + (random() - 0.5) * 1.3,
        (random() - 0.5) * 1.0,
        random() * 6,
      ],
      0.85 + random() * 0.35,
    );
    chips.setColorAt(
      i,
      color.setRGB(1, 1, 1).offsetHSL(0, 0, (random() - 0.5) * 0.1),
    );
  }
  inner.add(chips);

  if (part.fries) {
    const maps = fryMaps(128, 97);
    const count = mobile ? 7 : 11;
    const fries = new THREE.InstancedMesh(
      new RoundedBoxGeometry(0.1, 0.9, 0.1, 2, 0.03),
      new THREE.MeshPhysicalMaterial({
        map: maps.map,
        normalMap: maps.normalMap,
        roughnessMap: maps.roughnessMap,
        roughness: 1,
        sheen: 0.35,
        sheenColor: new THREE.Color("#ffd9a0"),
      }),
      count,
    );
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 1.6;
      const z = (random() - 0.5) * 0.9;
      // lying across the heap, pointing every which way
      placeInstance(fries, i, new THREE.Vector3(x, heap(x, z) + 0.12, z), [
        Math.PI / 2 + (random() - 0.5) * 0.5,
        0,
        random() * 6,
      ]);
    }
    inner.add(fries);
  }

  // nacho cheese poured in a zigzag over the heap
  const cheesePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const x = (t - 0.5) * 1.9;
    const z = Math.sin(t * Math.PI * 5) * 0.48;
    cheesePoints.push(new THREE.Vector3(x, heap(x, z) + 0.16, z));
  }
  inner.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(cheesePoints),
        200,
        0.045,
        8,
        false,
      ),
      new THREE.MeshPhysicalMaterial({
        color: "#f5b730",
        roughness: 0.25,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        sheen: 0.4,
        sheenColor: new THREE.Color("#ffe08a"),
      }),
    ),
  );

  if (part.meat) {
    const count = mobile ? 24 : 40;
    const meat = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.06),
      new THREE.MeshPhysicalMaterial({
        color: "#6b3a22",
        roughness: 0.7,
        flatShading: true,
        clearcoat: 0.2,
      }),
      count,
    );
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 1.8;
      const z = (random() - 0.5) * 1.0;
      placeInstance(
        meat,
        i,
        new THREE.Vector3(x, heap(x, z) + 0.14 + random() * 0.05, z),
        [random() * 3, random() * 3, random() * 3],
        0.7 + random() * 0.6,
      );
    }
    inner.add(meat);
  }
  if (part.veggies) {
    // diced tomato, onion and green pepper
    const count = mobile ? 24 : 36;
    const veggies = new THREE.InstancedMesh(
      new RoundedBoxGeometry(0.07, 0.05, 0.07, 2, 0.015),
      new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.5 }),
      count,
    );
    const shades = ["#d63a2a", "#e8d8e8", "#5c9a3a"].map(
      (hex) => new THREE.Color(hex),
    );
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 1.8;
      const z = (random() - 0.5) * 1.0;
      placeInstance(
        veggies,
        i,
        new THREE.Vector3(x, heap(x, z) + 0.15 + random() * 0.05, z),
        [random() * 3, random() * 3, random() * 3],
      );
      veggies.setColorAt(i, shades[i % shades.length] ?? color);
    }
    inner.add(veggies);
  }
  inner.position.y = -0.35;
  return tilted(inner, 0.42);
}

/* ------------------------------------------------------------------ */
/* Take-out box: foam clamshell with a back hinge                      */
/* ------------------------------------------------------------------ */

function pawTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = context2d(canvas);
  g.fillStyle = "#cfc6b6";
  g.beginPath();
  g.ellipse(128, 150, 44, 36, 0, 0, Math.PI * 2);
  g.fill();
  const toes: ReadonlyArray<readonly [number, number]> = [
    [80, 98],
    [112, 78],
    [146, 78],
    [178, 98],
  ];
  for (const [x, y] of toes) {
    g.beginPath();
    g.ellipse(x, y, 17, 21, 0, 0, Math.PI * 2);
    g.fill();
  }
  return canvasTexture(canvas);
}

function buildTakeoutBox() {
  const inner = new THREE.Group();
  const halfWidth = 1.0;
  const halfDepth = 0.95;
  const radius = 0.32;
  const foamMaps = matteMaps("#f7f5f0", "#e2ddd3", 128, 71);
  repeat(foamMaps.map, 3, 3);
  repeat(foamMaps.normalMap, 3, 3);
  const foam = new THREE.MeshPhysicalMaterial({
    map: foamMaps.map,
    normalMap: foamMaps.normalMap,
    roughness: 0.9,
    side: THREE.DoubleSide,
    sheen: 0.3,
    sheenColor: new THREE.Color("#ffffff"),
  });

  // base: a tapered tub with a flat flange around the top
  const rim = 0.63;
  const base = new THREE.Mesh(
    merge([
      roundedRectSweep(
        [
          [-0.14, 0],
          [-0.11, 0.06],
          [-0.02, 0.56],
          [0, 0.6],
          [0.13, 0.6],
          [0.14, rim],
        ],
        halfWidth,
        halfDepth,
        radius,
      ),
      roundedRectCap(halfWidth - 0.14, halfDepth - 0.14, radius - 0.14, 0),
    ]),
    foam,
  );
  base.castShadow = true;
  base.receiveShadow = true;
  inner.add(base);

  // lid: flange, short wall and a gently domed top
  const lidTop = 0.42;
  const dome = 0.12;
  const top = [halfWidth - 0.08, halfDepth - 0.08, radius - 0.08] as const;
  const lidShell = new THREE.Mesh(
    merge([
      roundedRectSweep(
        [
          [0.14, 0],
          [0.01, 0],
          [0, 0.03],
          [-0.03, 0.36],
          [-0.08, lidTop],
        ],
        halfWidth,
        halfDepth,
        radius,
      ),
      roundedRectCap(...top, lidTop, dome, 10),
    ]),
    foam,
  );
  lidShell.castShadow = true;
  // a paw stamped in the middle of the lid: the same dome scaled by k
  const k = 0.42;
  const paw = new THREE.Mesh(
    roundedRectCap(
      top[0] * k,
      top[1] * k,
      top[2] * k,
      lidTop + dome * (1 - k * k) + 0.004,
      dome * k * k,
      6,
    ),
    new THREE.MeshPhysicalMaterial({
      map: pawTexture(),
      alphaTest: 0.5,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  // the tab at the front that clicks the box shut
  const hingeZ = halfDepth + 0.14;
  const tab = new THREE.Mesh(
    new RoundedBoxGeometry(0.36, 0.05, 0.16, 2, 0.02),
    foam,
  );
  tab.position.set(0, 0.01, hingeZ + 0.06);
  const lid = new THREE.Group();
  lid.add(lidShell, paw, tab);
  lid.position.z = hingeZ;
  // hinge along the back edge of the flange
  const hinge = new THREE.Group();
  hinge.position.set(0, rim, -hingeZ);
  hinge.add(lid);
  inner.add(hinge);
  inner.position.y = -0.3;
  const wrap = tilted(inner, 0.4);

  // a slow loop: closed, swing open, hold, close
  const open = 1.9;
  const cycle = 6;
  const angleAt = (time: number) => {
    const t = time % cycle;
    if (t < 1.2) return 0;
    if (t < 2.6) return smooth(1.2, 2.6, t) * open;
    if (t < 4.6) return open;
    return (1 - smooth(4.6, cycle, t)) * open;
  };
  // sized with the lid open, so it never leaves the frame
  hinge.rotation.x = -open;
  wrap.userData.fit = sweptBox(wrap).getSize(new THREE.Vector3());
  hinge.rotation.x = 0;
  wrap.userData.update = ((_dt, time) => {
    hinge.rotation.x = -angleAt(time);
  }) satisfies ModelUpdate;
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Cat treats: a cat-face bowl of fish treats and kibble               */
/* ------------------------------------------------------------------ */

/** The face, drawn at about the band's own proportions so it stays round. */
function catFaceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const g = context2d(canvas);
  g.lineCap = "round";
  g.lineJoin = "round";
  // closed, happy eyes
  g.strokeStyle = "#2a2226";
  g.lineWidth = 16;
  for (const x of [317, 707]) {
    g.beginPath();
    g.arc(x, 165, 46, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  }
  // blush
  g.fillStyle = "#f4a7b0";
  for (const x of [236, 788]) {
    g.beginPath();
    g.ellipse(x, 200, 46, 24, 0, 0, Math.PI * 2);
    g.fill();
  }
  // nose and ω mouth
  g.fillStyle = "#ef8a9a";
  g.beginPath();
  g.moveTo(490, 172);
  g.lineTo(534, 172);
  g.lineTo(512, 198);
  g.closePath();
  g.fill();
  g.lineWidth = 11;
  g.beginPath();
  g.moveTo(474, 212);
  g.quadraticCurveTo(493, 240, 512, 212);
  g.quadraticCurveTo(531, 240, 550, 212);
  g.stroke();
  // whiskers
  g.lineWidth = 7;
  const whiskers: ReadonlyArray<readonly [number, number, number, number]> = [
    [176, 182, 70, 166],
    [176, 210, 74, 220],
    [848, 182, 954, 166],
    [848, 210, 950, 220],
  ];
  for (const [x1, y1, x2, y2] of whiskers) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  return canvasTexture(canvas);
}

function fishShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.12, 0);
  shape.quadraticCurveTo(-0.02, 0.07, 0.07, 0.02);
  shape.lineTo(0.13, 0.06);
  shape.lineTo(0.11, 0);
  shape.lineTo(0.13, -0.06);
  shape.lineTo(0.07, -0.02);
  shape.quadraticCurveTo(-0.02, -0.07, -0.12, 0);
  return shape;
}

function earGeometry(size: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-size, 0);
  shape.quadraticCurveTo(-size * 0.35, size * 0.9, 0, size * 1.25);
  shape.quadraticCurveTo(size * 0.35, size * 0.9, size, 0);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 12,
  });
}

function buildCatTreats(mobile: boolean) {
  const inner = new THREE.Group();
  const glaze = new THREE.MeshPhysicalMaterial({
    color: "#f3ebe0",
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    sheen: 0.2,
  });
  // low, wide bowl: outer wall up, rounded rim, inner wall down
  const outer = (t: number) => 0.9 + Math.sin(t * Math.PI * 0.5) * 0.35;
  const profile: THREE.Vector2[] = [new THREE.Vector2(0.0001, 0)];
  for (let i = 0; i <= 16; i++) {
    profile.push(new THREE.Vector2(outer(i / 16), (i / 16) * 0.55));
  }
  profile.push(new THREE.Vector2(1.24, 0.59), new THREE.Vector2(1.17, 0.58));
  for (let i = 16; i >= 0; i--) {
    const t = i / 16;
    profile.push(
      new THREE.Vector2(
        0.84 + Math.sin(t * Math.PI * 0.5) * 0.33,
        0.12 + t * 0.44,
      ),
    );
  }
  profile.push(new THREE.Vector2(0.0001, 0.12));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), glaze);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  inner.add(bowl);

  // the face on the front of the bowl (phi 0 faces the camera)
  const faceProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = 0.08 + (i / 12) * 0.84;
    faceProfile.push(new THREE.Vector2(outer(t) + 0.006, t * 0.55));
  }
  inner.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(faceProfile, 32, -0.8, 1.6),
      new THREE.MeshPhysicalMaterial({
        map: catFaceTexture(),
        alphaTest: 0.5,
        roughness: 0.2,
        clearcoat: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    ),
  );

  // ears on the rim, just outside the eyes
  const pink = new THREE.MeshPhysicalMaterial({
    color: "#f4a7b0",
    roughness: 0.3,
    clearcoat: 0.8,
  });
  for (const angle of [-0.48, 0.48]) {
    const shell = new THREE.Mesh(earGeometry(0.22), glaze);
    shell.position.z = -0.04;
    shell.castShadow = true;
    const innerEar = new THREE.Mesh(earGeometry(0.13), pink);
    innerEar.position.set(0, 0.03, 0.02);
    innerEar.scale.z = 0.5;
    const ear = new THREE.Group();
    ear.add(shell, innerEar);
    ear.position.set(Math.sin(angle) * 1.2, 0.56, Math.cos(angle) * 1.2);
    ear.rotation.set(-0.15, angle, 0);
    inner.add(ear);
  }

  // a pile of treats: a kibble mound with fish and kibble scattered on it
  const pileRadius = 0.86;
  const pileHeight = 0.36;
  const pile = new THREE.Mesh(
    heapGeometry(441, 0.06),
    new THREE.MeshPhysicalMaterial({
      color: "#9a5a2c",
      roughness: 0.7,
      sheen: 0.3,
      sheenColor: new THREE.Color("#e0a070"),
    }),
  );
  pile.scale.set(pileRadius, pileHeight, pileRadius);
  pile.position.y = 0.12;
  inner.add(pile);
  const pileTop = (r: number) =>
    0.12 + pileHeight * Math.sqrt(Math.max(0, 1 - (r / pileRadius) ** 2));

  const random = rng(431);
  const fishCount = mobile ? 34 : 50;
  const fish = new THREE.InstancedMesh(
    new THREE.ExtrudeGeometry(fishShape(), {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 2,
      curveSegments: 10,
    }),
    new THREE.MeshPhysicalMaterial({
      roughness: 0.55,
      sheen: 0.4,
      sheenColor: new THREE.Color("#ffd7a8"),
    }),
    fishCount,
  );
  fish.castShadow = true;
  const fishShades = ["#c87b3a", "#a85a2a", "#e09a52", "#d98b7a"].map(
    (hex) => new THREE.Color(hex),
  );
  const fallback = new THREE.Color("#c87b3a");
  for (let i = 0; i < fishCount; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 0.75;
    placeInstance(
      fish,
      i,
      new THREE.Vector3(
        Math.cos(a) * r,
        pileTop(r) + 0.02 + random() * 0.05,
        Math.sin(a) * r,
      ),
      [
        -Math.PI / 2 + (random() - 0.5) * 1.0,
        (random() - 0.5) * 0.8,
        random() * 6,
      ],
      1.15 + random() * 0.35,
    );
    fish.setColorAt(i, fishShades[i % fishShades.length] ?? fallback);
  }
  inner.add(fish);
  const kibbleCount = mobile ? 24 : 40;
  const kibble = new THREE.InstancedMesh(
    displace(new THREE.SphereGeometry(0.075, 14, 10), 0.012, 437, 4),
    new THREE.MeshPhysicalMaterial({ roughness: 0.6 }),
    kibbleCount,
  );
  const kibbleShades = ["#8a4d24", "#6e3a1a", "#b0703a"].map(
    (hex) => new THREE.Color(hex),
  );
  for (let i = 0; i < kibbleCount; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 0.8;
    placeInstance(
      kibble,
      i,
      new THREE.Vector3(
        Math.cos(a) * r,
        pileTop(r) + 0.03 + random() * 0.04,
        Math.sin(a) * r,
      ),
      [random() * 3, random() * 3, random() * 3],
      [1, 0.6, 1],
    );
    kibble.setColorAt(i, kibbleShades[i % kibbleShades.length] ?? fallback);
  }
  inner.add(kibble);
  inner.scale.setScalar(1.25);
  inner.position.y = -0.4;
  return tilted(inner, 0.38);
}

/* ------------------------------------------------------------------ */
/* Combos: the whole order together, each piece spinning in place      */
/* ------------------------------------------------------------------ */

type Placed = Readonly<{ model: THREE.Group; box: THREE.Box3 }>;

const COMBO_GAP = 0.35;

/** Width of a row of models standing side by side. */
const rowWidth = (row: ReadonlyArray<Placed>) =>
  row.reduce((sum, { box }) => sum + box.max.x - box.min.x, 0) +
  COMBO_GAP * Math.max(0, row.length - 1);

/** Lays a row out along x, centered on 0, standing on y = 0 at depth `z`. */
function placeRow(root: THREE.Group, row: ReadonlyArray<Placed>, z: number) {
  let x = -rowWidth(row) / 2;
  for (const { model, box } of row) {
    const width = box.max.x - box.min.x;
    const slot = new THREE.Group();
    slot.position.set(
      x + width / 2 - (box.min.x + box.max.x) / 2,
      -box.min.y,
      z - (box.min.z + box.max.z) / 2,
    );
    slot.add(model);
    root.add(slot);
    x += width + COMBO_GAP;
  }
}

async function buildCombo(parts: ReadonlyArray<ModelPart>, mobile: boolean) {
  const built = await Promise.all(parts.map((part) => buildPart(part, mobile)));
  const food: Placed[] = [];
  const drinks: Placed[] = [];
  // measured before placing: sweptBox needs the model on its own
  built.forEach((model, index) => {
    const placed = { model, box: sweptBox(model) };
    (parts[index]?.kind === "cup" ? drinks : food).push(placed);
  });
  const halfDepth = (row: ReadonlyArray<Placed>) =>
    Math.max(0, ...row.map(({ box }) => (box.max.z - box.min.z) / 2));

  const root = new THREE.Group();
  const together = rowWidth([...food, ...drinks]);
  if (food.length === 0 || drinks.length === 0 || together <= 7) {
    // a small order stands in one line, drinks either side of the food
    const half = Math.floor(drinks.length / 2);
    placeRow(
      root,
      [...drinks.slice(0, half), ...food, ...drinks.slice(half)],
      0,
    );
  } else {
    // a bigger order: food in front, drinks lined up behind
    placeRow(root, food, COMBO_GAP / 2 + halfDepth(food));
    placeRow(root, drinks, -(COMBO_GAP / 2 + halfDepth(drinks)));
  }
  root.userData.spin = built.flatMap((model) => spinTargets(model));
  const updates = built
    .map((model) => model.userData.update as ModelUpdate | undefined)
    .filter((update): update is ModelUpdate => Boolean(update));
  if (updates.length > 0) root.userData.update = combined(updates);
  return root;
}

/* ------------------------------------------------------------------ */
/* Bottled water: a clear PET bottle with a blue cap and a shop label  */
/* ------------------------------------------------------------------ */

const BOTTLE_BASE = -1.6;
const BOTTLE_BODY_TOP = 0.55;
const BOTTLE_NECK = 1.25;
const BOTTLE_R = 0.58;
const NECK_R = 0.2;
const LABEL_LOW = -0.4;
const LABEL_HIGH = 0.35;

/** Outer radius of the bottle at height y: ribbed body, round shoulder, neck. */
function bottleRadius(y: number) {
  if (y <= BOTTLE_BODY_TOP) {
    // molded grip rings below the label
    const ribbed = y > -1.35 && y < LABEL_LOW - 0.08;
    return ribbed
      ? BOTTLE_R - 0.022 * Math.max(0, Math.sin((y + 1.35) * 22))
      : BOTTLE_R;
  }
  if (y <= BOTTLE_NECK) {
    const t = (y - BOTTLE_BODY_TOP) / (BOTTLE_NECK - BOTTLE_BODY_TOP);
    return NECK_R + (BOTTLE_R - NECK_R) * (0.5 + 0.5 * Math.cos(t * Math.PI));
  }
  return NECK_R;
}

/** Profile from the middle of the base up the wall to the top of the neck. */
function bottleProfile(inset: number, top: number, steps: number) {
  const points = [
    new THREE.Vector2(0, BOTTLE_BASE + inset),
    new THREE.Vector2(BOTTLE_R - 0.08 - inset, BOTTLE_BASE + inset),
    new THREE.Vector2(BOTTLE_R - 0.02 - inset, BOTTLE_BASE + 0.05 + inset),
  ];
  const start = BOTTLE_BASE + 0.12;
  for (let i = 0; i <= steps; i++) {
    const y = start + (i / steps) * (top - start);
    points.push(new THREE.Vector2(bottleRadius(y) - inset, y));
  }
  return points;
}

function bottleLabelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const g = context2d(canvas);
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#1f6fd1");
  sky.addColorStop(1, "#0d4a9e");
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 256);
  // a light wave along the bottom
  g.fillStyle = "#5ec8f5";
  g.beginPath();
  g.moveTo(0, 256);
  for (let x = 0; x <= 1024; x += 8) {
    g.lineTo(x, 200 + 12 * Math.sin((x / 1024) * Math.PI * 6));
  }
  g.lineTo(1024, 256);
  g.closePath();
  g.fill();
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  // twice round the bottle, so the name always faces the viewer once a turn
  for (const x of [256, 768]) {
    g.font = "700 64px system-ui, sans-serif";
    g.fillText("Brew ni Cat", x, 96);
    g.font = "600 26px system-ui, sans-serif";
    g.fillText("PURIFIED DRINKING WATER", x, 150);
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Vertical grip ridges round a cylinder, by pushing side vertices out. */
function ridged(
  geometry: THREE.CylinderGeometry,
  radius: number,
  ridges: number,
) {
  const position = geometry.attributes.position!;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const r = Math.hypot(x, z);
    if (r < radius * 0.98) continue;
    const bump = 1 + 0.04 * Math.max(0, Math.cos(Math.atan2(z, x) * ridges));
    position.setXYZ(i, x * bump, position.getY(i), z * bump);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function buildBottledWater(mobile: boolean) {
  const inner = new THREE.Group();
  const segments = mobile ? 64 : 112;
  const steps = mobile ? 90 : 160;
  const neckTop = 1.52;

  // PET plastic, like the cups: clear, thin, a faint blue cast
  const plastic = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1,
    thickness: 0.06,
    ior: 1.45,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.06,
    specularIntensity: 1,
    attenuationColor: new THREE.Color("#e4f3fb"),
    attenuationDistance: 3,
    envMapIntensity: 1.2,
  });
  const shell = new THREE.Mesh(
    new THREE.LatheGeometry(bottleProfile(0, neckTop, steps), segments),
    plastic,
  );
  shell.castShadow = true;
  inner.add(shell);

  // the water: opaque, so it shows through the bottle's transmission pass
  const fill = 0.95;
  const waterPoints = bottleProfile(0.035, fill, steps);
  waterPoints.push(new THREE.Vector2(0, fill));
  const water = new THREE.Mesh(
    new THREE.LatheGeometry(waterPoints, segments),
    new THREE.MeshPhysicalMaterial({
      color: "#cfeefc",
      emissive: "#7cc6ee",
      emissiveIntensity: 0.14,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1,
    }),
  );
  inner.add(water);

  // wrap-around label
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(
      BOTTLE_R + 0.006,
      BOTTLE_R + 0.006,
      LABEL_HIGH - LABEL_LOW,
      segments,
      1,
      true,
    ),
    new THREE.MeshPhysicalMaterial({
      map: bottleLabelTexture(),
      roughness: 0.45,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
    }),
  );
  label.position.y = (LABEL_HIGH + LABEL_LOW) / 2;
  inner.add(label);

  // ridged cap and the tamper ring under it
  const capMaterial = new THREE.MeshPhysicalMaterial({
    color: "#2f7fd8",
    roughness: 0.35,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  });
  const capR = NECK_R + 0.05;
  const capH = 0.3;
  const cap = new THREE.Mesh(
    ridged(new THREE.CylinderGeometry(capR, capR, capH, 96, 1), capR, 36),
    capMaterial,
  );
  cap.position.y = neckTop + capH / 2 - 0.04;
  cap.castShadow = true;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(capR - 0.01, 0.028, 12, 72),
    capMaterial,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = neckTop - 0.09;
  inner.add(cap, ring);

  inner.position.y = -0.1;
  const wrap = tilted(inner, 0.12);
  wrap.userData.fit = sweptBox(wrap).getSize(new THREE.Vector3());
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

async function buildPart(
  part: ModelPart,
  mobile: boolean,
): Promise<THREE.Group> {
  switch (part.kind) {
    case "cup":
      return buildCup(part, mobile);
    case "takoyaki":
      return buildTakoyaki(part, mobile);
    case "fries":
      return buildFries(part, mobile);
    case "noodles":
      return buildNoodles(part, mobile);
    case "nachos":
      return buildNachos(part, mobile);
    case "takeout-box":
      return buildTakeoutBox();
    case "cat-treats":
      return buildCatTreats(mobile);
    case "bottled-water":
      return buildBottledWater(mobile);
    case "cutout":
      return buildCutout(part.src);
  }
}

/**
 * The item's photo with the background removed, as a flat card that sways
 * and tilts as it floats. It never turns far enough to show its back.
 */
async function buildCutout(src: string): Promise<THREE.Group> {
  const texture = await photoTexture(src, 8);
  const image = texture.image as HTMLImageElement;
  const aspect = image.width / image.height;
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(aspect, 1),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.04,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  card.position.y = 0.5;
  const group = new THREE.Group();
  group.add(card);
  // no full turns: a sway and a slow nod instead
  group.userData.spin = [];
  group.userData.update = (_dt: number, time: number) => {
    card.rotation.y = Math.sin(time * 0.8) * 0.5;
    card.rotation.x = Math.sin(time * 0.6 + 1) * 0.06;
    card.rotation.z = Math.sin(time * 0.7) * 0.03;
  };
  return group;
}

/** Builds the model for a menu item's spec (see `modelSpecFor`). */
export async function buildModel(
  spec: ModelSpec,
  mobile: boolean,
): Promise<THREE.Group> {
  const model =
    spec.kind === "combo"
      ? await buildCombo(spec.parts, mobile)
      : await buildPart(spec, mobile);
  model.name = spec.key;
  return model;
}
