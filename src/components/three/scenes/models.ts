import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { photoTexture } from "../engine/renderer";
import { smooth, clamp01 } from "../engine/runtime";
import {
  batterMaps,
  beanMaps,
  condensationMaps,
  fbm,
  fryMaps,
  iceMaps,
  leafMaps,
  matteMaps,
  rng,
  sauceMaps,
} from "../engine/textures";

/**
 * Physically based product models for the showcase. Geometry is modelled
 * procedurally to the proportions in the shop's own photos; surfaces use
 * MeshPhysicalMaterial with generated normal/roughness maps and the studio
 * HDRI for reflections.
 */

const repeat = (texture: THREE.Texture | undefined, x: number, y: number) => {
  if (texture) texture.repeat.set(x, y);
  return texture;
};

/** Pushes vertices along their normals by tileable noise for organic shapes. */
function displace(
  geometry: THREE.BufferGeometry,
  amount: number,
  seed: number,
  frequency = 1.6,
) {
  const size = 64;
  const field = fbm(size, seed, 3, 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const u = Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5;
    const w = clamp01(v.y * frequency * 0.5 + 0.5);
    const index =
      Math.floor(w * (size - 1)) * size + Math.floor(u * (size - 1));
    const d = ((field[index] ?? 0.5) - 0.5) * amount;
    position.setXYZ(
      i,
      v.x + normal.getX(i) * d,
      v.y + normal.getY(i) * d,
      v.z + normal.getZ(i) * d,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Iced drink in a clear PET cup                                       */
/* ------------------------------------------------------------------ */
const CUP_H = 3.0;
const R_BOT = 0.6;
const R_TOP = 0.86;
const Y0 = -1.5;
const cupR = (y: number) => R_BOT + ((y - Y0) / CUP_H) * (R_TOP - R_BOT);

const drinkLayers = {
  matcha: [
    [0, "#6f8f2a"],
    [0.45, "#93ad3e"],
    [0.68, "#b4c45c"],
    [0.78, "#8a7440"],
    [0.86, "#4e2f18"],
    [1, "#3d2312"],
  ],
  catfeine: [
    [0, "#e9dcc4"],
    [0.45, "#ddc9a8"],
    [0.58, "#a57c52"],
    [0.7, "#6d4425"],
    [1, "#4d2f19"],
  ],
} as const;

function layerColor(
  stops: readonly (readonly [number, string])[],
  f: number,
  out: THREE.Color,
) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (a && b && f <= b[0]) {
      return out.set(a[1]).lerp(new THREE.Color(b[1]), smooth(a[0], b[0], f));
    }
  }
  return out.set(stops[stops.length - 1]?.[1] ?? "#ffffff");
}

export function iceGeometry(seed: number, size = 0.42) {
  const geometry = new RoundedBoxGeometry(size, size, size, 4, size * 0.2);
  return displace(geometry, size * 0.18, seed, 3);
}

export async function makeCup(stickerSrc: string) {
  const group = new THREE.Group();
  const condensation = condensationMaps(512, 3);
  repeat(condensation.normalMap, 3, 2);
  repeat(condensation.roughnessMap, 3, 2);
  // PET plastic: IOR ~1.45, thin wall, beaded condensation on the outside
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1,
    thickness: 0.08,
    ior: 1.45,
    roughness: 0.05,
    roughnessMap: condensation.roughnessMap,
    normalMap: condensation.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    specularIntensity: 1,
    attenuationColor: new THREE.Color("#f2f7f2"),
    attenuationDistance: 2.5,
    envMapIntensity: 1.1,
  });
  const points: THREE.Vector2[] = [new THREE.Vector2(0, Y0)];
  for (let i = 0; i <= 28; i++) {
    const y = Y0 + 0.02 + (i / 28) * (CUP_H - 0.08);
    // shallow moulded ribs near the base, like real PET cups
    const rib = y < Y0 + 0.5 ? Math.sin(i * 2.4) * 0.006 : 0;
    points.push(new THREE.Vector2(cupR(y) + rib, y));
  }
  const yTop = Y0 + CUP_H;
  points.push(
    new THREE.Vector2(R_TOP + 0.05, yTop - 0.02),
    new THREE.Vector2(R_TOP + 0.05, yTop + 0.03),
    new THREE.Vector2(R_TOP - 0.02, yTop + 0.03),
  );
  for (let i = 28; i >= 0; i--) {
    const y = Y0 + 0.08 + (i / 28) * (CUP_H - 0.12);
    points.push(new THREE.Vector2(cupR(y) - 0.025, y));
  }
  points.push(new THREE.Vector2(0, Y0 + 0.08));
  const wall = new THREE.Mesh(new THREE.LatheGeometry(points, 96), shell);
  wall.castShadow = true;
  group.add(wall);

  const lidMaterial = shell.clone();
  lidMaterial.normalMap = null;
  lidMaterial.roughnessMap = null;
  lidMaterial.roughness = 0.04;
  const lidPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    lidPoints.push(
      new THREE.Vector2(
        (1 - t) * (R_TOP + 0.07) + 0.0001,
        yTop + 0.04 + Math.sin(t * Math.PI * 0.5) * 0.42,
      ),
    );
  }
  lidPoints.reverse();
  group.add(
    new THREE.Mesh(new THREE.LatheGeometry(lidPoints, 96), lidMaterial),
  );
  const lidRing = new THREE.Mesh(
    new THREE.TorusGeometry(R_TOP + 0.06, 0.035, 16, 120),
    lidMaterial,
  );
  lidRing.rotation.x = Math.PI / 2;
  lidRing.position.y = yTop + 0.04;
  group.add(lidRing);

  // layered drink: opaque so it reads through the cup's transmission pass;
  // sheen and a faint self-tint stand in for light scattering in milk
  const fill = 0.9;
  const liquidPoints: THREE.Vector2[] = [new THREE.Vector2(0, Y0 + 0.09)];
  for (let i = 0; i <= 36; i++) {
    const y = Y0 + 0.09 + (i / 36) * (CUP_H * fill);
    liquidPoints.push(new THREE.Vector2(cupR(y) - 0.04, y));
  }
  const yFill = Y0 + 0.09 + CUP_H * fill;
  liquidPoints.push(new THREE.Vector2(0, yFill));
  const liquidGeometry = new THREE.LatheGeometry(liquidPoints, 72);
  const count = liquidGeometry.attributes.position!.count;
  const colors = new Float32Array(count * 3);
  liquidGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const fractions = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    fractions[i] = clamp01(
      (liquidGeometry.attributes.position!.getY(i) - Y0) / (yFill - Y0),
    );
  }
  const tmp = new THREE.Color();
  const palette = (name: keyof typeof drinkLayers) => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      layerColor(drinkLayers[name], fractions[i] ?? 0, tmp).toArray(arr, i * 3);
    }
    return arr;
  };
  const palettes = [palette("matcha"), palette("catfeine")] as const;
  const liquid = new THREE.Mesh(
    liquidGeometry,
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.32,
      clearcoat: 0.25,
      clearcoatRoughness: 0.25,
      sheen: 0.6,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color("#fff6e6"),
      envMapIntensity: 0.6,
    }),
  );
  group.add(liquid);
  const setDrink = (t: number) => {
    for (let i = 0; i < count * 3; i++) {
      const a = palettes[0][i] ?? 0;
      const b = palettes[1][i] ?? 0;
      colors[i] = a + (b - a) * t;
    }
    liquidGeometry.attributes.color!.needsUpdate = true;
  };
  setDrink(0);

  // ice in the drink: polished and wet; outside the cup the floaters refract
  const ice = iceMaps(256, 17);
  const iceInCup = new THREE.MeshPhysicalMaterial({
    color: "#dfeaf0",
    roughness: 0.05,
    roughnessMap: ice.roughnessMap,
    normalMap: ice.normalMap,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    ior: 1.31,
    specularIntensity: 1,
    transparent: true,
    opacity: 0.82,
    envMapIntensity: 1.2,
  });
  [
    [-0.32, 0.12, 0.6],
    [0.28, -0.22, 1.2],
    [0.05, 0.36, 2.3],
    [-0.12, -0.38, 0.2],
  ].forEach(([x = 0, z = 0, r = 0], index) => {
    const cube = new THREE.Mesh(iceGeometry(100 + index), iceInCup);
    cube.position.set(x, yFill - 0.06, z);
    cube.rotation.set(r, r * 1.7, r * 0.6);
    group.add(cube);
  });

  const straw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 3.6, 32, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: "#121015",
      roughness: 0.32,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  straw.position.set(0.22, 0.9, -0.05);
  straw.rotation.z = -0.1;
  straw.castShadow = true;
  group.add(straw);

  // the shop's own cat sticker, cut from the matcha photo
  const stickerTexture = await photoTexture(stickerSrc);
  const sy = -0.15;
  const sh = 0.86;
  const sw = sh * (212 / 272);
  const rs = cupR(sy) + 0.012;
  const sticker = new THREE.Mesh(
    new THREE.CylinderGeometry(
      cupR(sy + sh / 2) + 0.012,
      cupR(sy - sh / 2) + 0.012,
      sh,
      32,
      1,
      true,
      -sw / rs / 2,
      sw / rs,
    ),
    new THREE.MeshPhysicalMaterial({
      map: stickerTexture,
      alphaTest: 0.5,
      roughness: 0.35,
      clearcoat: 0.6,
    }),
  );
  sticker.position.y = sy;
  group.add(sticker);

  return { group, setDrink };
}

/* ------------------------------------------------------------------ */
/* Takoyaki in a foam clamshell                                        */
/* ------------------------------------------------------------------ */
export function makeTakoyaki(mobile: boolean) {
  const inner = new THREE.Group();
  const foamMaps = matteMaps("#e2ddd4", "#c4bdb2", 128, 51);
  repeat(foamMaps.map, 4, 4);
  repeat(foamMaps.normalMap, 4, 4);
  const foam = new THREE.MeshPhysicalMaterial({
    map: foamMaps.map,
    normalMap: foamMaps.normalMap,
    roughness: 0.92,
    sheen: 0.3,
    sheenColor: new THREE.Color("#ffffff"),
  });
  const base = new THREE.Mesh(
    new RoundedBoxGeometry(2.7, 0.42, 1.9, 4, 0.1),
    foam,
  );
  base.castShadow = true;
  base.receiveShadow = true;
  inner.add(base);
  const lid = new THREE.Mesh(
    new RoundedBoxGeometry(2.7, 0.14, 1.9, 4, 0.06),
    foam,
  );
  lid.geometry.translate(0, 0, -0.95);
  lid.position.set(0, 0.22, -0.92);
  lid.rotation.x = 1.85;
  lid.castShadow = true;
  inner.add(lid);

  const batter = batterMaps(256, 5);
  const ballMaterial = new THREE.MeshPhysicalMaterial({
    map: batter.map,
    normalMap: batter.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: batter.roughnessMap,
    roughness: 1,
    sheen: 0.25,
    sheenColor: new THREE.Color("#f0b46a"),
  });
  const sauce = sauceMaps("#4a210d", "#220c04", 128, 8);
  const sauceMaterial = new THREE.MeshPhysicalMaterial({
    map: sauce.map,
    normalMap: sauce.normalMap,
    roughnessMap: sauce.roughnessMap,
    roughness: 1,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
  });
  const random = rng(77);
  const tops: THREE.Vector3[] = [];
  const balls: THREE.Vector3[] = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const geometry = displace(
        new THREE.SphereGeometry(0.4, 48, 32),
        0.05,
        200 + r * 3 + c,
        2.5,
      );
      const ball = new THREE.Mesh(geometry, ballMaterial);
      ball.position.set((c - 1) * 0.82, 0.52, (r - 0.5) * 0.82);
      ball.scale.set(1, 0.88, 1);
      ball.castShadow = true;
      const cap = new THREE.Mesh(
        displace(
          new THREE.SphereGeometry(0.415, 48, 18, 0, Math.PI * 2, 0, 1.05),
          0.03,
          300 + r * 3 + c,
        ),
        sauceMaterial,
      );
      cap.rotation.set(
        (random() - 0.5) * 0.4,
        random() * 6,
        (random() - 0.5) * 0.4,
      );
      ball.add(cap);
      inner.add(ball);
      tops.push(ball.position.clone().add(new THREE.Vector3(0, 0.34, 0)));
      balls.push(ball.position.clone());
    }
  }
  // kewpie-style mayo: a thin zigzag piped over each ball, draped on the
  // sauce so it follows the curve instead of bridging between balls
  const mayoMaterial = new THREE.MeshPhysicalMaterial({
    color: "#efe5cd",
    roughness: 0.22,
    clearcoat: 0.7,
    sheen: 0.5,
    sheenColor: new THREE.Color("#fff9ea"),
  });
  const mayoRadius = 0.43;
  balls.forEach((center, index) => {
    const points: THREE.Vector3[] = [];
    const turn = random() * Math.PI;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const u = (t - 0.5) * 0.56;
      const v = Math.sin(t * Math.PI * 5 + index) * 0.17;
      const x = u * Math.cos(turn) - v * Math.sin(turn);
      const z = u * Math.sin(turn) + v * Math.cos(turn);
      const y = Math.sqrt(Math.max(0, mayoRadius ** 2 - x * x - z * z)) * 0.88;
      points.push(new THREE.Vector3(center.x + x, center.y + y, center.z + z));
    }
    inner.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          120,
          0.026,
          10,
          false,
        ),
        mayoMaterial,
      ),
    );
  });
  // aonori and thin, curled katsuobushi flakes
  const nori = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.035, 0.01, 0.03),
    new THREE.MeshStandardMaterial({ color: "#2a4f18", roughness: 0.8 }),
    mobile ? 60 : 110,
  );
  const flakeGeometry = new THREE.PlaneGeometry(0.18, 0.11, 6, 3);
  const flakePosition = flakeGeometry.attributes.position!;
  for (let i = 0; i < flakePosition.count; i++) {
    const x = flakePosition.getX(i);
    flakePosition.setZ(i, Math.sin(x * 18) * 0.02 + x * x * 1.4);
  }
  flakeGeometry.computeVertexNormals();
  const bonito = new THREE.InstancedMesh(
    flakeGeometry,
    new THREE.MeshPhysicalMaterial({
      color: "#d9a882",
      roughness: 0.55,
      side: THREE.DoubleSide,
      sheen: 0.8,
      sheenColor: new THREE.Color("#f6d6b8"),
    }),
    mobile ? 18 : 32,
  );
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < nori.count; i++) {
    const top = tops[i % 6] ?? new THREE.Vector3();
    const a = random() * Math.PI * 2;
    const rr = random() * 0.3;
    const p = top
      .clone()
      .add(
        new THREE.Vector3(
          Math.cos(a) * rr,
          0.03 - rr * rr * 0.6,
          Math.sin(a) * rr,
        ),
      );
    m4.compose(p, q.setFromEuler(e.set(random(), random() * 3, random())), s);
    nori.setMatrixAt(i, m4);
  }
  for (let i = 0; i < bonito.count; i++) {
    const top = tops[i % 6] ?? new THREE.Vector3();
    const p = top
      .clone()
      .add(
        new THREE.Vector3((random() - 0.5) * 0.4, 0.1, (random() - 0.5) * 0.4),
      );
    m4.compose(
      p,
      q.setFromEuler(e.set(random() * 3, random() * 3, random() * 3)),
      s,
    );
    bonito.setMatrixAt(i, m4);
  }
  inner.add(nori, bonito);
  inner.rotation.x = 0.5;
  inner.position.y = -0.3;
  const wrap = new THREE.Group();
  wrap.add(inner);
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Fries in a wire cone with a paper liner                             */
/* ------------------------------------------------------------------ */
export function makeFries(mobile: boolean) {
  const inner = new THREE.Group();
  const wire = new THREE.MeshPhysicalMaterial({
    color: "#26252b",
    metalness: 1,
    roughness: 0.28,
    clearcoat: 0.3,
  });
  const top = 0.75;
  const bottom = -1.5;
  const rTop = 0.95;
  const rBottom = 0.14;
  const rAt = (y: number) =>
    rBottom + ((y - bottom) / (top - bottom)) * (rTop - rBottom);
  [top, 0.15, -0.45, -1.0].forEach((y) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rAt(y), 0.022, 10, 96),
      wire,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    inner.add(ring);
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p0 = new THREE.Vector3(Math.cos(a) * rTop, top, Math.sin(a) * rTop);
    const p1 = new THREE.Vector3(
      Math.cos(a) * rBottom,
      bottom,
      Math.sin(a) * rBottom,
    );
    inner.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.018, 8),
        wire,
      ),
    );
  }
  const foot = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.03, 10, 72),
    wire,
  );
  foot.rotation.x = Math.PI / 2;
  foot.position.y = -1.95;
  inner.add(foot);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const p0 = new THREE.Vector3(
      Math.cos(a) * rAt(-1.0),
      -1.0,
      Math.sin(a) * rAt(-1.0),
    );
    const p1 = new THREE.Vector3(Math.cos(a) * 0.62, -1.95, Math.sin(a) * 0.62);
    inner.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.022, 8),
        wire,
      ),
    );
  }
  const paperGeometry = new THREE.CylinderGeometry(
    rTop - 0.03,
    rBottom,
    top - bottom + 0.1,
    128,
    10,
    true,
  );
  const pos = paperGeometry.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const a = Math.atan2(z, x);
    const k =
      1 + 0.045 * Math.cos(a * 14) + (y > 1.0 ? 0.08 * Math.sin(a * 3) : 0);
    pos.setXYZ(i, x * k, y + 0.06 * Math.sin(a * 5) * (y > 1 ? 1 : 0), z * k);
  }
  paperGeometry.computeVertexNormals();
  const paperMaps = matteMaps("#f1e6cc", "#d9c9a6", 128, 57);
  repeat(paperMaps.map, 3, 2);
  repeat(paperMaps.normalMap, 3, 2);
  const paper = new THREE.Mesh(
    paperGeometry,
    new THREE.MeshPhysicalMaterial({
      map: paperMaps.map,
      normalMap: paperMaps.normalMap,
      roughness: 0.9,
      side: THREE.DoubleSide,
      sheen: 0.4,
      sheenColor: new THREE.Color("#fffaf0"),
    }),
  );
  paper.position.y = (top + bottom) / 2 + 0.1;
  paper.castShadow = true;
  inner.add(paper);

  const N = mobile ? 26 : 38;
  const maps = fryMaps(128, 21);
  const fry = new THREE.InstancedMesh(
    displace(new RoundedBoxGeometry(0.12, 1.5, 0.12, 3, 0.035), 0.012, 401, 4),
    new THREE.MeshPhysicalMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      roughness: 1,
      sheen: 0.35,
      sheenColor: new THREE.Color("#ffd9a0"),
      clearcoat: 0.15,
      clearcoatRoughness: 0.5,
    }),
    N,
  );
  fry.castShadow = true;
  const random = rng(91);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3(1, 1, 1);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt(i / N) * 0.62;
    const p = new THREE.Vector3(
      Math.cos(a) * r,
      1.0 + random() * 0.4 - r * 0.3,
      Math.sin(a) * r,
    );
    e.set(
      (random() - 0.5) * 0.5 + Math.sin(a) * r * 0.5,
      random() * 3,
      (random() - 0.5) * 0.5 - Math.cos(a) * r * 0.5,
    );
    m4.compose(p, q.setFromEuler(e), s.set(1, 0.75 + random() * 0.4, 1));
    fry.setMatrixAt(i, m4);
    fry.setColorAt(
      i,
      c.setRGB(1, 1, 1).offsetHSL(0, 0, (random() - 0.5) * 0.12),
    );
  }
  inner.add(fry);
  inner.rotation.x = 0.18;
  const wrap = new THREE.Group();
  wrap.add(inner);
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Buldak Carbo: glazed bowl, sauced noodles, fried egg, seaweed       */
/* ------------------------------------------------------------------ */
export function makeBuldak(mobile: boolean) {
  const inner = new THREE.Group();
  const bowlPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    bowlPoints.push(
      new THREE.Vector2(
        0.55 + Math.sin(t * Math.PI * 0.5) * 0.95,
        -0.7 + t * 0.95,
      ),
    );
  }
  bowlPoints.push(new THREE.Vector2(1.52, 0.27), new THREE.Vector2(1.44, 0.27));
  for (let i = 24; i >= 0; i--) {
    const t = i / 24;
    bowlPoints.push(
      new THREE.Vector2(
        0.48 + Math.sin(t * Math.PI * 0.5) * 0.92,
        -0.62 + t * 0.89,
      ),
    );
  }
  bowlPoints.unshift(new THREE.Vector2(0.0001, -0.7));
  bowlPoints.push(new THREE.Vector2(0.0001, -0.62));
  const glaze = new THREE.MeshPhysicalMaterial({
    color: "#1c1a1f",
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    sheen: 0.2,
  });
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPoints, 96), glaze);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  inner.add(bowl);

  const sauce = sauceMaps("#e3893d", "#b5521e", 128, 18);
  repeat(sauce.map, 6, 1);
  repeat(sauce.normalMap, 6, 1);
  const random = rng(123);
  const strands: THREE.BufferGeometry[] = [];
  const strandCount = mobile ? 26 : 44;
  for (let n = 0; n < strandCount; n++) {
    const pts: THREE.Vector3[] = [];
    let a = random() * Math.PI * 2;
    let r = 0.2 + random() * 0.9;
    for (let k = 0; k < 10; k++) {
      a += 0.5 + random() * 0.6;
      r = Math.min(1.25, Math.max(0.1, r + (random() - 0.5) * 0.35));
      pts.push(
        new THREE.Vector3(
          Math.cos(a) * r,
          0.02 + random() * 0.22 + (1.25 - r) * 0.12,
          Math.sin(a) * r,
        ),
      );
    }
    strands.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts),
        64,
        0.032,
        6,
        false,
      ),
    );
  }
  const noodles = new THREE.Mesh(
    mergeGeometries(strands),
    new THREE.MeshPhysicalMaterial({
      map: sauce.map,
      normalMap: sauce.normalMap,
      roughnessMap: sauce.roughnessMap,
      roughness: 1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.18,
      sheen: 0.4,
      sheenColor: new THREE.Color("#ffd2a0"),
    }),
  );
  noodles.castShadow = true;
  inner.add(noodles);
  strands.forEach((g) => g.dispose());

  // fried egg: irregular white with crisp edge, glossy domed yolk
  const white = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = 0.62 + Math.sin(a * 3 + 1) * 0.06 + Math.sin(a * 7) * 0.03;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) white.moveTo(x, y);
    else white.lineTo(x, y);
  }
  const whiteGeometry = new THREE.ExtrudeGeometry(white, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 24,
  });
  const edge = matteMaps("#f7f2e8", "#d9b98d", 128, 131);
  const egg = new THREE.Group();
  const eggWhite = new THREE.Mesh(
    whiteGeometry,
    new THREE.MeshPhysicalMaterial({
      map: edge.map,
      normalMap: edge.normalMap,
      roughness: 0.3,
      clearcoat: 0.4,
      sheen: 0.6,
      sheenColor: new THREE.Color("#ffffff"),
    }),
  );
  eggWhite.rotation.x = -Math.PI / 2;
  egg.add(eggWhite);
  const yolk = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: "#f2a31b",
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      sheen: 0.5,
      sheenColor: new THREE.Color("#ffd27a"),
      emissive: "#5a2a00",
      emissiveIntensity: 0.2,
    }),
  );
  yolk.scale.set(1, 0.55, 1);
  yolk.position.set(0.08, 0.07, -0.05);
  egg.add(yolk);
  egg.position.set(0.18, 0.36, 0.1);
  egg.rotation.set(0.12, 0.4, -0.08);
  egg.castShadow = true;
  inner.add(egg);

  const seaweed = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, 0.006, 0.05),
    new THREE.MeshPhysicalMaterial({
      color: "#0f1a10",
      roughness: 0.45,
      sheen: 0.4,
      sheenColor: new THREE.Color("#3a5a3a"),
    }),
    mobile ? 8 : 14,
  );
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < seaweed.count; i++) {
    const a = random() * Math.PI * 2;
    const r = 0.3 + random() * 0.8;
    m4.compose(
      new THREE.Vector3(
        Math.cos(a) * r,
        0.3 + random() * 0.08,
        Math.sin(a) * r,
      ),
      q.setFromEuler(
        e.set((random() - 0.5) * 0.3, random() * 3, (random() - 0.5) * 0.3),
      ),
      new THREE.Vector3(1, 1, 1),
    );
    seaweed.setMatrixAt(i, m4);
  }
  inner.add(seaweed);
  inner.scale.setScalar(1.15);
  // Tilt the bowl toward the camera once, then spin the contents around the
  // bowl's own axis. Spinning the tilted group instead turned the opening
  // away every half turn and showed an empty black underside.
  const tilt = new THREE.Group();
  tilt.rotation.x = 0.55;
  tilt.add(inner);
  const wrap = new THREE.Group();
  wrap.add(tilt);
  wrap.userData.spin = inner;
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Floating ingredients                                                */
/* ------------------------------------------------------------------ */
export function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(0.3, -0.28, 0.28, 0.22, 0, 0.5);
  shape.bezierCurveTo(-0.28, 0.22, -0.3, -0.28, 0, -0.5);
  const geometry = new THREE.ShapeGeometry(shape, 24);
  const p = geometry.attributes.position!;
  const uv = geometry.attributes.uv!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // gentle cupping along the midrib and a soft twist, like a dried leaf
    p.setZ(i, -0.9 * x * x + 0.12 * y * y + 0.05 * x * y);
    uv.setXY(i, x + 0.5, y + 0.5);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function beanGeometry() {
  const geometry = new THREE.SphereGeometry(0.5, 40, 28);
  const p = geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    const y = p.getY(i);
    let z = p.getZ(i);
    // flatten one face and press the centre cut into it
    if (z > 0) z *= 0.45;
    const groove =
      z > 0 ? Math.exp(-Math.pow(x * 9, 2)) * 0.12 * (1 - y * y * 3) : 0;
    z -= Math.max(0, groove);
    x *= 0.78;
    p.setXYZ(i, x, y, z);
  }
  geometry.scale(1, 1.25, 1);
  geometry.computeVertexNormals();
  return geometry;
}

export function floaterMaterials() {
  const ice = iceMaps(256, 23);
  const leaf = leafMaps(256, 41);
  const bean = beanMaps(128, 31);
  const fries = fryMaps(128, 29);
  return {
    // free-floating ice refracts the scene behind it
    ice: new THREE.MeshPhysicalMaterial({
      color: "#f4fbff",
      transmission: 1,
      thickness: 0.7,
      ior: 1.31,
      roughness: 0.04,
      roughnessMap: ice.roughnessMap,
      normalMap: ice.normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      attenuationColor: new THREE.Color("#d8ecf5"),
      attenuationDistance: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      specularIntensity: 1,
      envMapIntensity: 1.3,
    }),
    leaf: new THREE.MeshPhysicalMaterial({
      map: leaf.map,
      normalMap: leaf.normalMap,
      roughnessMap: leaf.roughnessMap,
      roughness: 1,
      side: THREE.DoubleSide,
      sheen: 0.5,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#b9dc8a"),
      clearcoat: 0.2,
    }),
    bean: new THREE.MeshPhysicalMaterial({
      map: bean.map,
      normalMap: bean.normalMap,
      roughnessMap: bean.roughnessMap,
      roughness: 1,
      clearcoat: 0.45,
      clearcoatRoughness: 0.35,
    }),
    flake: new THREE.MeshPhysicalMaterial({
      color: "#d9a882",
      roughness: 0.55,
      side: THREE.DoubleSide,
      sheen: 0.8,
      sheenColor: new THREE.Color("#f6d6b8"),
    }),
    fry: new THREE.MeshPhysicalMaterial({
      map: fries.map,
      normalMap: fries.normalMap,
      roughnessMap: fries.roughnessMap,
      roughness: 1,
      sheen: 0.35,
      sheenColor: new THREE.Color("#ffd9a0"),
    }),
    chili: new THREE.MeshPhysicalMaterial({
      color: "#a3170e",
      roughness: 0.35,
      clearcoat: 0.6,
      side: THREE.DoubleSide,
    }),
  };
}

export function flakeGeometry() {
  const geometry = new THREE.PlaneGeometry(0.5, 0.32, 8, 3);
  const p = geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, Math.sin(x * 9) * 0.03 + x * x * 0.8);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function chiliGeometry() {
  const geometry = new THREE.CircleGeometry(0.5, 7);
  return displace(geometry, 0.25, 501, 1);
}

/** Soft dark contact shadow texture for under a product. */
export function contactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d");
  if (g) {
    const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(0,0,0,0.85)");
    gradient.addColorStop(0.45, "rgba(0,0,0,0.35)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}
