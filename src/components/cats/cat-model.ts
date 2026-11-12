import * as THREE from "three";

import type { CatCoat, CatPose } from "@/lib/cats/cats";

/**
 * A shop cat built from three.js geometry (ADR-032): no pictures or model
 * files. Spheres with a little noise pushed into them make the furry body,
 * head and cheeks; cones make the ears; a chain of joints makes the tail.
 * The colours and markings come from `CatCoat`. Model units: a sitting cat
 * is 1 tall from its feet (y = 0) to its ear tips, facing +z.
 */

export type CatModel = {
  root: THREE.Group;
  /** Moves the cat's idle life on by `dt` seconds. `look` is -1..1 each way. */
  update: (dt: number, time: number, look: { x: number; y: number }) => void;
  /** The head tilts up and the mouth opens for a moment. */
  meow: () => void;
  dispose: () => void;
};

/** A small, repeatable random sequence, so each cat moves a little differently. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Fur: each vertex pushed out a little along its direction from the middle. */
function fur(
  geometry: THREE.BufferGeometry,
  size: number,
  fluff: number,
  seed: number,
  middle = new THREE.Vector3(),
) {
  if (fluff <= 0) return geometry;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const amount = size * 0.06 * fluff;
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const n = v.clone().sub(middle).normalize();
    // tufts: a few overlapping waves, stronger on the lower half
    const tuft =
      Math.sin(n.x * 17 + seed) *
      Math.sin(n.y * 13 - seed) *
      Math.sin(n.z * 19 + seed * 2);
    const lower = 0.6 + 0.4 * Math.max(0, -n.y);
    v.addScaledVector(n, amount * tuft * lower);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function furSphere(radius: number, fluff: number, seed: number, detail = 28) {
  return fur(
    new THREE.SphereGeometry(radius, detail, Math.round(detail * 0.75)),
    radius,
    fluff,
    seed,
  );
}

/**
 * A sitting cat's body in one smooth piece: a pear turned on a lathe, wide
 * haunches at the bottom narrowing to the shoulders.
 */
function sittingBody(fluff: number, seed: number) {
  const profile = [
    [0.001, 0],
    [0.2, 0.005],
    [0.28, 0.05],
    [0.31, 0.14],
    [0.29, 0.25],
    [0.24, 0.36],
    [0.19, 0.47],
    [0.16, 0.56],
    [0.12, 0.63],
    [0.001, 0.66],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const curve = new THREE.SplineCurve(profile);
  const geometry = new THREE.LatheGeometry(curve.getPoints(40), 40);
  geometry.computeVertexNormals();
  return fur(geometry, 0.3, fluff, seed, new THREE.Vector3(0, 0.3, 0));
}

const materials = new Map<string, THREE.MeshStandardMaterial>();
function paint(color: string, roughness = 0.92) {
  const key = `${color}:${roughness}`;
  let material = materials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness: 0,
    });
    materials.set(key, material);
  }
  return material;
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  at: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...at);
  m.scale.set(...scale);
  return m;
}

/** One eye: iris, slit pupil, a glint, and a lid that closes for blinks. */
function makeEye(iris: string, coat: string, side: number) {
  const eye = new THREE.Group();
  const ball = new THREE.SphereGeometry(0.052, 20, 14);
  eye.add(mesh(ball, paint(iris, 0.35), [0, 0, 0], [1, 1.05, 0.7]));
  const pupil = mesh(
    ball,
    paint("#111014", 0.3),
    [0, 0, 0.022],
    [0.32, 0.9, 0.5],
  );
  eye.add(pupil);
  const glint = mesh(
    new THREE.SphereGeometry(0.012, 8, 6),
    new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    [0.016 * side, 0.02, 0.04],
  );
  eye.add(glint);
  // the lid: the top half of a sphere in the coat colour, rotated down to blink
  const lidPivot = new THREE.Group();
  const lid = mesh(
    new THREE.SphereGeometry(0.058, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    paint(coat),
    [0, 0, 0],
    [1, 1.05, 0.78],
  );
  lidPivot.add(lid);
  lidPivot.rotation.x = -1.25; // open: folded back, out of sight
  eye.add(lidPivot);
  return { eye, lidPivot, pupil };
}

function makeEar(look: CatCoat, side: number) {
  const ear = new THREE.Group();
  const outer = mesh(
    new THREE.ConeGeometry(0.105, 0.2, 18),
    paint(look.ears),
    [0, 0.09, 0],
    [1, 1, 0.55],
  );
  const inner = mesh(
    new THREE.ConeGeometry(0.07, 0.15, 14),
    paint(look.innerEar),
    [0, 0.07, 0.022],
    [1, 1, 0.35],
  );
  ear.add(outer, inner);
  ear.rotation.z = -0.32 * side;
  ear.rotation.x = -0.1;
  return ear;
}

/** A chain of joints; each bends a little later than the one before. */
function makeTail(look: CatCoat, fluff: number, segments = 11) {
  const base = new THREE.Group();
  const joints: THREE.Group[] = [];
  let parent: THREE.Object3D = base;
  const length = 0.06;
  for (let i = 0; i < segments; i += 1) {
    const joint = new THREE.Group();
    joint.position.y = i === 0 ? 0 : length;
    const t = i / (segments - 1);
    const radius = (0.05 + 0.02 * fluff) * (1 - t * 0.35);
    const color = t > 0.75 ? look.tailTip : look.tail;
    // capsules overlapping at every joint make one smooth tail
    joint.add(
      mesh(new THREE.CapsuleGeometry(radius, length, 6, 12), paint(color), [
        0,
        length / 2,
        0,
      ]),
    );
    parent.add(joint);
    joints.push(joint);
    parent = joint;
  }
  return { base, joints };
}

/** Whiskers: thin white lines from the muzzle. */
function makeWhiskers(side: number) {
  const points: number[] = [];
  for (const [dy, spread] of [
    [0.012, 0.05],
    [-0.008, 0],
    [-0.026, -0.05],
  ] as const) {
    points.push(0.04 * side, dy, 0.05, 0.25 * side, dy + spread, 0.02);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.75,
    }),
  );
}

function makeHead(look: CatCoat, seed: number) {
  const head = new THREE.Group();
  const fluff = look.fluff;
  head.add(
    mesh(
      furSphere(0.25, fluff * 0.6, seed),
      paint(look.coat),
      [0, 0, 0],
      [1.12, 0.92, 0.95],
    ),
  );
  if (look.cap)
    head.add(
      mesh(
        furSphere(0.2, fluff * 0.5, seed + 1),
        paint(look.cap),
        [0, 0.07, -0.01],
        [1.15, 0.78, 0.95],
      ),
    );
  // fluffy cheeks
  for (const side of [-1, 1])
    head.add(
      mesh(
        furSphere(0.13, fluff, seed + side),
        paint(look.coat),
        [0.13 * side, -0.08, 0.1],
        [1.05, 0.9, 0.9],
      ),
    );
  // muzzle pads and chin
  for (const side of [-1, 1])
    head.add(
      mesh(
        new THREE.SphereGeometry(0.07, 18, 12),
        paint(look.muzzle),
        [0.052 * side, -0.085, 0.205],
        [1, 0.82, 0.85],
      ),
    );
  head.add(
    mesh(
      new THREE.SphereGeometry(0.05, 14, 10),
      paint(look.muzzle),
      [0, -0.135, 0.18],
      [1, 0.7, 0.9],
    ),
  );
  // the mouth, closed until a meow
  const mouth = mesh(
    new THREE.SphereGeometry(0.035, 14, 10),
    paint("#5b2e33", 0.6),
    [0, -0.12, 0.215],
    [1, 0.05, 0.6],
  );
  head.add(mouth);
  // nose
  const nose = mesh(
    new THREE.SphereGeometry(0.03, 14, 10),
    paint(look.nose, 0.5),
    [0, -0.04, 0.262],
    [1.15, 0.7, 0.8],
  );
  nose.rotation.x = 0.4;
  head.add(nose);
  // eyes
  const left = makeEye(look.eyeLeft, look.cap ?? look.coat, -1);
  const right = makeEye(look.eyeRight, look.cap ?? look.coat, 1);
  left.eye.position.set(-0.098, 0.025, 0.2);
  right.eye.position.set(0.098, 0.025, 0.2);
  left.eye.rotation.y = -0.28;
  right.eye.rotation.y = 0.28;
  head.add(left.eye, right.eye);
  // ears
  const ears = [-1, 1].map((side) => {
    const ear = makeEar(look, side);
    ear.position.set(0.14 * side, 0.15, -0.02);
    head.add(ear);
    return ear;
  });
  for (const side of [-1, 1]) {
    const whiskers = makeWhiskers(side);
    whiskers.position.set(0, -0.085, 0.21);
    head.add(whiskers);
  }
  return {
    head,
    lids: [left.lidPivot, right.lidPivot],
    pupils: [left.pupil, right.pupil],
    ears,
    mouth,
  };
}

/** A thin collar with a round name tag hanging at the front. */
function makeTag(color: string) {
  const tag = new THREE.Group();
  const collar = mesh(
    new THREE.TorusGeometry(0.15, 0.012, 8, 40),
    paint("#b8475a", 0.55),
    [0, 0, 0],
    [1, 0.9, 1],
  );
  collar.rotation.x = Math.PI / 2 + 0.3;
  tag.add(collar);
  const ring = mesh(
    new THREE.TorusGeometry(0.012, 0.004, 6, 12),
    paint("#c9ccd1", 0.3),
    [0, -0.05, 0.155],
  );
  const disc = mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.01, 28),
    paint(color, 0.3),
    [0, -0.095, 0.16],
  );
  disc.rotation.x = Math.PI / 2;
  tag.add(ring, disc);
  return tag;
}

export function buildCat(look: CatCoat, pose: CatPose, seed: number): CatModel {
  const random = seeded(seed * 9973 + 17);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fluff = look.fluff;
  const coat = paint(look.coat);

  const { head, lids, pupils, ears, mouth } = makeHead(look, seed);
  const tail = makeTail(look, fluff);

  const neck = new THREE.Group();
  if (pose === "sit") {
    // one pear-shaped body leaning forward a little, with a chest bib
    const torso = mesh(
      sittingBody(fluff, seed + 4),
      coat,
      [0, 0, -0.03],
      [1.05, 1, 0.92],
    );
    torso.rotation.x = 0.1;
    body.add(torso);
    body.add(
      mesh(
        furSphere(0.14, fluff, seed + 6),
        paint(look.chest),
        [0, 0.4, 0.165],
        [1.05, 1.45, 0.55],
      ),
    );
    // hind legs folded at the sides
    for (const side of [-1, 1]) {
      body.add(
        mesh(
          furSphere(0.14, fluff, seed + 7 + side),
          coat,
          [0.22 * side, 0.12, 0.01],
          [0.75, 0.95, 1.2],
        ),
      );
      body.add(
        mesh(
          new THREE.SphereGeometry(0.06, 16, 10),
          paint(look.paws),
          [0.23 * side, 0.03, 0.16],
          [1, 0.6, 1.5],
        ),
      );
    }
    // front legs and paws
    for (const side of [-1, 1]) {
      const leg = mesh(
        new THREE.CapsuleGeometry(0.056, 0.26, 6, 14),
        paint(look.paws === look.chest ? look.paws : look.coat),
        [0.085 * side, 0.18, 0.225],
      );
      leg.rotation.x = -0.12;
      body.add(leg);
      body.add(
        mesh(
          new THREE.SphereGeometry(0.066, 16, 10),
          paint(look.paws),
          [0.085 * side, 0.035, 0.26],
          [1, 0.62, 1.25],
        ),
      );
    }
    neck.position.set(0, 0.62, 0.08);
    head.position.set(0, 0.12, 0.02);
    tail.base.position.set(0.12, 0.05, -0.22);
    tail.base.rotation.z = -1.35;
  } else {
    // lying: a long loaf, head up at the front, paws tucked forward
    body.add(
      mesh(
        furSphere(0.3, fluff, seed + 4),
        coat,
        [0.15, 0.22, -0.02],
        [1.65, 0.72, 0.95],
      ),
    );
    body.add(
      mesh(
        furSphere(0.2, fluff, seed + 5),
        paint(look.chest),
        [-0.22, 0.2, 0.12],
        [1.1, 0.85, 0.8],
      ),
    );
    for (const side of [-1, 1])
      body.add(
        mesh(
          new THREE.SphereGeometry(0.065, 16, 10),
          paint(look.paws),
          [-0.36 + side * 0.05, 0.05, 0.22 + side * 0.04],
          [1.5, 0.6, 1],
        ),
      );
    neck.position.set(-0.32, 0.36, 0.08);
    head.position.set(0, 0.05, 0.02);
    tail.base.position.set(0.62, 0.08, 0.05);
    tail.base.rotation.z = -1.5;
  }
  neck.add(head);
  body.add(neck, tail.base);
  if (look.tag) {
    const tag = makeTag(look.tag);
    tag.position.set(0, pose === "sit" ? -0.02 : -0.04, 0.0);
    neck.add(tag);
  }

  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) object.castShadow = false;
  });

  // idle state
  let blinkIn = 1 + random() * 3;
  let blink = 0; // 0 open .. 1 closed
  let twitchIn = 2 + random() * 5;
  let twitch = 0;
  let twitchEar = 0;
  let meowFor = 0;
  const phase = random() * Math.PI * 2;
  const tailSpeed = 1.4 + random() * 0.8;
  const look2 = { x: 0, y: 0 };
  const sleepy = pose === "lie";

  return {
    root,
    meow() {
      meowFor = 0.55;
    },
    update(dt, time, look) {
      const t = time + phase;
      // breathing
      const breath = Math.sin(t * (sleepy ? 1.4 : 2.1));
      body.scale.set(
        1 + breath * 0.012,
        1 + breath * 0.018,
        1 + breath * 0.012,
      );

      // the head follows the pointer, slowly
      const k = 1 - Math.exp(-dt * 3);
      look2.x += (look.x - look2.x) * k;
      look2.y += (look.y - look2.y) * k;
      const meowing = meowFor > 0;
      head.rotation.y = look2.x * 0.55 + Math.sin(t * 0.37) * 0.06;
      head.rotation.x =
        look2.y * 0.3 + (meowing ? -0.35 : 0) + Math.sin(t * 0.29) * 0.03;
      head.rotation.z = Math.sin(t * 0.23) * 0.07 - look2.x * 0.08;
      for (const pupil of pupils) pupil.position.x = look2.x * 0.012;

      // blinking (a sleepy cat keeps its eyes half shut)
      blinkIn -= dt;
      if (blinkIn <= 0 && blink === 0) {
        blink = 0.001;
        blinkIn = 2.5 + random() * 4;
      }
      let closed = sleepy ? 0.55 : 0;
      if (blink > 0) {
        blink += dt / 0.22;
        closed = Math.max(closed, Math.sin(Math.min(blink, 1) * Math.PI));
        if (blink >= 1) blink = 0;
      }
      for (const lid of lids) lid.rotation.x = -1.25 + closed * 1.25;

      // an ear twitch now and then
      twitchIn -= dt;
      if (twitchIn <= 0) {
        twitch = 1;
        twitchEar = random() < 0.5 ? 0 : 1;
        twitchIn = 3 + random() * 6;
      }
      twitch = Math.max(0, twitch - dt * 4);
      ears.forEach((ear, i) => {
        const side = i === 0 ? -1 : 1;
        const flick =
          i === twitchEar ? Math.sin(twitch * Math.PI * 3) * 0.35 * twitch : 0;
        ear.rotation.z =
          -0.32 * side + flick * side + (meowing ? 0.25 * side : 0);
      });

      // the tail: a travelling wave, lazier when lying down
      const amp = sleepy ? 0.08 : 0.16;
      tail.joints.forEach((joint, i) => {
        joint.rotation.z =
          (i === 0 ? 0 : 0.13) + Math.sin(t * tailSpeed - i * 0.55) * amp;
        joint.rotation.x = Math.sin(t * tailSpeed * 0.5 - i * 0.4) * amp * 0.5;
      });

      // meow: mouth opens and closes
      meowFor = Math.max(0, meowFor - dt);
      const open = meowing ? Math.sin((1 - meowFor / 0.55) * Math.PI) : 0;
      mouth.scale.y = 0.05 + open * 0.75;
    },
    dispose() {
      root.traverse((object) => {
        const geometry = (object as THREE.Mesh).geometry;
        geometry?.dispose();
      });
    },
  };
}

/** The shared materials, freed when the last stage closes. */
export function disposeCatMaterials() {
  for (const material of materials.values()) material.dispose();
  materials.clear();
}
