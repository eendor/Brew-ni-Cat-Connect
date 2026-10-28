import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import {
  canvasTexture,
  context2d,
  disposeScene,
  makeRenderer,
  studioEnvironment,
  warmUp,
} from "../engine/renderer";
import {
  damp,
  fontFamilies,
  nextTask,
  pointer,
  type Quality,
} from "../engine/runtime";
import { fbm, matteMaps, normalFromHeight, woodMaps } from "../engine/textures";

export type VisitFacts = Readonly<{
  /** The main hours and the days they apply to. */
  hours: string;
  days: string;
  /** A day with its own hours, like a shorter Sunday. */
  otherDay: string;
  otherHours: string;
  closedDay: string;
  shopSign: string;
  neighborSign: string;
  street: string;
}>;

/** Painted sign face: enamel paint on a dark board, lit by the studio rig. */
function signFace(
  open: boolean,
  facts: VisitFacts,
  display: string,
  body: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const g = context2d(canvas);
  // the painted panel fills the whole board face (no dark margin), with
  // rounded corners that follow the board and the enamel border at the edge
  g.fillStyle = "#18151c";
  g.beginPath();
  g.roundRect(0, 0, 1024, 640, 22);
  g.fill();
  const color = open ? "#8fe07f" : "#ff6f8f";
  g.strokeStyle = color;
  g.lineWidth = 14;
  g.beginPath();
  g.roundRect(22, 22, 980, 596, 18);
  g.stroke();
  g.textAlign = "center";
  g.fillStyle = color;
  g.font = `900 250px ${display}`;
  g.fillText(open ? "OPEN" : "CLOSED", 512, 300);
  g.fillStyle = "#F4F1EA";
  g.font = `800 104px ${display}`;
  g.fillText(
    open ? facts.hours.toUpperCase() : `EVERY ${facts.closedDay.toUpperCase()}`,
    512,
    438,
    920,
  );
  g.fillStyle = "#B9B3C2";
  g.font = `800 34px ${body}`;
  const other = `${facts.otherDay} ${facts.otherHours}`;
  const notes = open
    ? [facts.days, other]
    : [`Open ${facts.days} ${facts.hours}`, other];
  // maxWidth squeezes a long line instead of letting it run off the board
  notes.forEach((note, index) =>
    g.fillText(note.toUpperCase(), 512, 510 + index * 48, 920),
  );
  return canvasTexture(canvas);
}

function label(
  text: string,
  w: number,
  h: number,
  color: string,
  bg: string,
  size: number,
  display: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = context2d(canvas);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${size}px ${display}`;
  g.fillText(text, w / 2, h / 2 + 4);
  return canvasTexture(canvas);
}

/** Normal map for corrugated sheet metal (awnings, roll-up shutters). */
function corrugated() {
  const size = 128;
  const grain = fbm(size, 97, 4, 16);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      height[i] =
        Math.sin((x / size) * Math.PI * 2 * 4) * 0.5 +
        0.5 +
        (grain[i] ?? 0) * 0.15;
    }
  }
  return normalFromHeight(height, size, 2);
}

function asphalt() {
  const size = 256;
  const n = fbm(size, 91, 6, 16);
  return normalFromHeight(n, size, 2.5);
}

export async function initVisit(
  canvas: HTMLCanvasElement,
  quality: Quality,
  facts: VisitFacts,
) {
  const renderer = makeRenderer(canvas, quality, {
    alpha: true,
    shadows: true,
  });
  renderer.setClearColor(0, 0);
  const env = await studioEnvironment(renderer);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const key = new THREE.DirectionalLight("#fff1dc", 2.2);
  key.position.set(4, 7, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  scene.add(key);
  const warm = new THREE.SpotLight("#FFB547", 60, 20, 0.6, 0.8, 2);
  warm.position.set(-4, 4, -3);
  scene.add(warm, warm.target);

  const { display, body } = fontFamilies();

  /* hanging flip sign on a cord, pivoting at the nail */
  const sign = new THREE.Group();
  const swing = new THREE.Group();
  sign.add(swing);
  // the sign builds while the visitor scrolls toward it: the setup yields
  // after each generated texture so the scrolling keeps its frames
  const wood = woodMaps(256, 61);
  await nextTask();
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(3.3, 2.06, 0.12, 4, 0.06),
    new THREE.MeshPhysicalMaterial({
      map: wood.map,
      normalMap: wood.normalMap,
      roughnessMap: wood.roughnessMap,
      roughness: 1,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
    }),
  );
  board.position.y = -2.2;
  board.castShadow = true;
  swing.add(board);
  // the face covers the board almost to its edge, so only a hairline of
  // wood shows; transparent corners follow the board's rounded corners
  const faceGeometry = new THREE.PlaneGeometry(3.27, 2.03);
  const paint = (map: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      map,
      alphaTest: 0.5,
      roughness: 0.38,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      emissiveMap: map,
      emissive: "#ffffff",
      emissiveIntensity: 0.18,
    });
  const front = new THREE.Mesh(
    faceGeometry,
    paint(signFace(true, facts, display, body)),
  );
  front.position.set(0, -2.2, 0.062);
  const back = new THREE.Mesh(
    faceGeometry,
    paint(signFace(false, facts, display, body)),
  );
  back.position.set(0, -2.2, -0.062);
  back.rotation.y = Math.PI;
  swing.add(front, back);
  const cord = new THREE.MeshPhysicalMaterial({
    color: "#c9b48f",
    roughness: 0.9,
    sheen: 0.6,
  });
  [-1.25, 1.25].forEach((x) => {
    swing.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.LineCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(x, -1.17, 0),
          ),
          1,
          0.02,
          8,
        ),
        cord,
      ),
    );
  });
  const nail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16),
    new THREE.MeshPhysicalMaterial({
      color: "#9a9aa2",
      metalness: 1,
      roughness: 0.3,
    }),
  );
  nail.rotation.x = Math.PI / 2;
  sign.add(nail);
  scene.add(sign);

  /* street model: concrete shopfronts, asphalt road, the shop's own sign */
  const diorama = new THREE.Group();
  const concrete = matteMaps("#3a3740", "#2a2830", 128, 81);
  const plate = new THREE.Mesh(
    new RoundedBoxGeometry(5, 0.24, 3.4, 4, 0.08),
    new THREE.MeshPhysicalMaterial({
      map: concrete.map,
      normalMap: concrete.normalMap,
      roughness: 0.85,
    }),
  );
  plate.receiveShadow = true;
  diorama.add(plate);
  const roadNormal = asphalt();
  await nextTask();
  roadNormal.repeat.set(4, 1);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 0.9),
    new THREE.MeshPhysicalMaterial({
      map: label(
        facts.street.toUpperCase(),
        1024,
        184,
        "#8a8494",
        "#1c1a20",
        80,
        display,
      ),
      normalMap: roadNormal,
      roughness: 0.9,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.125, 1.05);
  road.receiveShadow = true;
  diorama.add(road);
  /*
   * Facing the street: Pulido Eatery is the larger two-story concrete
   * building on the left, and Brew ni Cat is the small single-room unit
   * right next to it on its right, with a roll-up shutter and a serving
   * counter. Relative sizes follow the shop's own photos of the frontage.
   */
  const wallMaterial = (base: string, dark: string, seed: number) => {
    const wall = matteMaps(base, dark, 128, seed);
    return new THREE.MeshPhysicalMaterial({
      map: wall.map,
      normalMap: wall.normalMap,
      roughness: 0.82,
    });
  };
  const ribbed = corrugated();
  await nextTask();
  const metal = (color: string, repeat: number) => {
    const normalMap = ribbed.clone();
    normalMap.needsUpdate = true;
    normalMap.repeat.set(repeat, 1);
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.75,
      roughness: 0.42,
      normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });
  };
  const signPlaque = (
    text: string,
    w: number,
    h: number,
    color: string,
    glow: number,
  ) => {
    const map = label(
      text,
      768,
      Math.round((768 * h) / w),
      color,
      "#120f16",
      Math.round(((768 * h) / w) * 0.56),
      display,
    );
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshPhysicalMaterial({
        map,
        emissiveMap: map,
        emissive: "#ffffff",
        emissiveIntensity: glow,
        roughness: 0.4,
        clearcoat: 0.6,
      }),
    );
  };
  const glassPane = (w: number, h: number, light: string, intensity: number) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshPhysicalMaterial({
        color: "#0b0a0d",
        roughness: 0.06,
        clearcoat: 1,
        emissive: light,
        emissiveIntensity: intensity,
      }),
    );
  const FRONT = 0.7; // front face of a 1.4-deep block, relative to its group

  /* Pulido Eatery: wide two-story neighbor on the left */
  const eatery = new THREE.Group();
  const eateryW = 2.85;
  const eateryH = 2.05;
  const eateryBlock = new THREE.Mesh(
    new RoundedBoxGeometry(eateryW, eateryH, 1.4, 3, 0.04),
    wallMaterial("#2a2830", "#1b1a1f", 85),
  );
  eateryBlock.position.y = eateryH / 2 + 0.12;
  eateryBlock.castShadow = true;
  eateryBlock.receiveShadow = true;
  eatery.add(eateryBlock);
  const eateryOpening = glassPane(eateryW * 0.78, 0.72, "#5a4a3c", 0.22);
  eateryOpening.position.set(0, 0.12 + 0.4, FRONT + 0.005);
  eatery.add(eateryOpening);
  [-0.68, 0.68].forEach((x) => {
    const pane = glassPane(0.78, 0.46, "#3e3a46", 0.14);
    pane.position.set(x, 0.12 + 1.55, FRONT + 0.005);
    eatery.add(pane);
  });
  const eateryAwning = new THREE.Mesh(
    new THREE.BoxGeometry(eateryW * 0.96, 0.03, 0.5),
    metal("#5b5a60", 18),
  );
  eateryAwning.position.set(0, 0.12 + 1.02, FRONT + 0.24);
  eateryAwning.rotation.x = 0.16;
  eateryAwning.castShadow = true;
  eatery.add(eateryAwning);
  const eaterySign = signPlaque(
    facts.neighborSign.toUpperCase(),
    eateryW * 0.7,
    0.24,
    "#B9B3C2",
    0.18,
  );
  eaterySign.position.set(0, 0.12 + 1.22, FRONT + 0.006);
  eatery.add(eaterySign);
  eatery.position.set(-0.85, 0, -0.5);
  diorama.add(eatery);

  /* Brew ni Cat: compact single-room unit on the eatery's right */
  const shop = new THREE.Group();
  const shopW = 1.15;
  const shopH = 1.08;
  const shopBlock = new THREE.Mesh(
    new RoundedBoxGeometry(shopW, shopH, 1.1, 3, 0.03),
    wallMaterial("#2e2a35", "#1f1b24", 83),
  );
  shopBlock.position.set(0, shopH / 2 + 0.12, -0.15);
  shopBlock.castShadow = true;
  shopBlock.receiveShadow = true;
  shop.add(shopBlock);
  const shopFront = FRONT - 0.3;
  // flat roof slab with a short overhang
  const roof = new THREE.Mesh(
    new RoundedBoxGeometry(shopW + 0.12, 0.06, 1.3, 2, 0.02),
    wallMaterial("#34313a", "#232028", 87),
  );
  roof.position.set(0, shopH + 0.15, -0.08);
  roof.castShadow = true;
  shop.add(roof);
  // warmly lit room seen through the open serving window
  const room = glassPane(shopW * 0.8, 0.46, "#ffb04a", 0.75);
  room.position.set(0, 0.12 + 0.62, shopFront + 0.004);
  shop.add(room);
  // roll-up shutter, pulled up to the head of the opening
  const shutter = new THREE.Mesh(
    new THREE.BoxGeometry(shopW * 0.84, 0.16, 0.05),
    metal("#6d6b72", 10),
  );
  shutter.position.set(0, 0.12 + 0.93, shopFront + 0.03);
  shutter.castShadow = true;
  shop.add(shutter);
  // wooden serving counter under the window
  const counterWood = woodMaps(128, 67);
  const counter = new THREE.Mesh(
    new RoundedBoxGeometry(shopW * 0.86, 0.06, 0.2, 2, 0.015),
    new THREE.MeshPhysicalMaterial({
      map: counterWood.map,
      normalMap: counterWood.normalMap,
      roughnessMap: counterWood.roughnessMap,
      roughness: 1,
      clearcoat: 0.4,
    }),
  );
  counter.position.set(0, 0.12 + 0.38, shopFront + 0.09);
  counter.castShadow = true;
  shop.add(counter);
  const shopSign = signPlaque(
    facts.shopSign.toUpperCase(),
    shopW * 0.92,
    0.2,
    "#FFB547",
    0.7,
  );
  shopSign.position.set(0, shopH + 0.12 - 0.04, shopFront + 0.05);
  shop.add(shopSign);
  // a real lamp: the room light spills onto the pavement
  const spill = new THREE.PointLight("#ffb04a", 2.4, 2.2, 2);
  spill.position.set(0, 0.12 + 0.6, shopFront + 0.35);
  shop.add(spill);
  shop.position.set(1.25, 0, -0.5);
  diorama.add(shop);

  const pin = new THREE.Group();
  const pinPoints: THREE.Vector2[] = [];
  const C = 1.1;
  const PR = 0.42;
  const yT = C - (PR * PR) / C;
  const rT = PR * Math.sqrt(1 - (PR / C) ** 2);
  for (let i = 0; i <= 48; i++) {
    const y = (i / 48) * (C + PR);
    const r =
      y < yT ? (y / yT) * rT : Math.sqrt(Math.max(0, PR * PR - (y - C) ** 2));
    pinPoints.push(new THREE.Vector2(Math.max(0.0001, r), y));
  }
  const pinMesh = new THREE.Mesh(
    new THREE.LatheGeometry(pinPoints, 64),
    new THREE.MeshPhysicalMaterial({
      color: "#e8820f",
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
  );
  pinMesh.castShadow = true;
  pin.scale.setScalar(0.72);
  pin.add(pinMesh);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 24, 16),
    new THREE.MeshPhysicalMaterial({
      color: "#0B0A0D",
      roughness: 0.3,
      clearcoat: 1,
    }),
  );
  dot.position.set(0, 1.1, 0.33);
  pin.add(dot);
  pin.position.set(1.25, 1.75, 0.1);
  diorama.add(pin);
  const pinShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 32),
    new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  pinShadow.rotation.x = -Math.PI / 2;
  pinShadow.position.set(1.25, 0.13, 0.55);
  diorama.add(pinShadow);
  scene.add(diorama);

  let mobile = false;
  /** Camera distance at which `halfWidth` units fill half the canvas width. */
  const fitDistance = (halfWidth: number) =>
    halfWidth /
    (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    mobile = camera.aspect < 0.95;
    camera.fov = mobile ? 35 : 30;
    if (mobile) {
      sign.position.set(0, 4.6, 0);
      sign.scale.setScalar(1.1);
      diorama.position.set(0, -2.9, -0.5);
      diorama.scale.setScalar(1.1);
      camera.position.set(0, 0.6, 15.5);
      camera.lookAt(0, 0.4, 0);
    } else if (camera.aspect > 1.9) {
      // full-bleed band: spread the sign and street out and frame them
      // tighter so the scene fills the width instead of floating in a box
      sign.position.set(-3.9, 2.55, 0.6);
      sign.scale.setScalar(1.05);
      diorama.position.set(3.4, -0.95, -0.8);
      diorama.scale.setScalar(0.95);
      camera.position.set(0, 1.4, 12.4);
      camera.lookAt(0, 0.45, 0);
    } else {
      sign.position.set(-2.9, 2.6, 0.6);
      sign.scale.setScalar(1);
      diorama.position.set(2.4, -1.3, -0.8);
      diorama.scale.setScalar(0.88);
      // The sign's left edge (plus its swing) and the street's far corner
      // reach about 4.75 units from center. On squarer boxes, like the
      // Contact page's 7:6 canvas, step the camera back until both fit
      // instead of letting the canvas edge cut the sign off.
      camera.position.set(0, 2.2, Math.max(15, 0.6 + fitDistance(5)));
      camera.lookAt(0, 0.2, 0);
    }
    warm.target.position.copy(diorama.position);
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const st = { flip: 0, flipTarget: 0, swingV: 0, swingA: 0, time: 0 };
  const toggle = () => {
    st.flipTarget = st.flipTarget ? 0 : 1;
    st.swingV += 1.4;
    return st.flipTarget === 1;
  };

  function frame(dt: number, sectionProgress: number) {
    st.time += dt;
    st.flip = damp(st.flip, st.flipTarget, 3.2, dt);
    const force =
      -st.swingA * 9 - st.swingV * 1.6 + Math.sin(st.time * 0.8) * 0.12;
    st.swingV += force * dt;
    st.swingA += st.swingV * dt;
    swing.rotation.z = st.swingA * 0.12 + pointer.x * 0.03;
    swing.rotation.y = st.flip * Math.PI + Math.sin(st.time * 0.6) * 0.06;
    swing.rotation.x = -0.08 + (sectionProgress - 0.5) * 0.15;
    diorama.rotation.y =
      -0.35 + Math.sin(st.time * 0.25) * 0.08 + pointer.x * 0.08;
    diorama.rotation.x = 0.12;
    pin.position.y = 1.62 + Math.sin(st.time * 2) * 0.1;
    pin.rotation.y = st.time * 1.2;
    const bounce = (pin.position.y - 1.52) / 0.2;
    pinShadow.scale.setScalar(1.15 - bounce * 0.3);
    renderer.render(scene, camera);
  }

  // shaders compile off the main thread and have their first draw now,
  // before the scene is shown, not in the frames scrolled past it
  await renderer.compileAsync(scene, camera);
  warmUp(renderer, scene, () => renderer.render(scene, camera));

  return {
    frame,
    toggle,
    dispose() {
      observer.disconnect();
      disposeScene(scene, renderer);
    },
  };
}
