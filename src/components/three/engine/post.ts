import * as THREE from "three";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import {
  SMAABlendShader,
  SMAAEdgesShader,
  SMAAWeightsShader,
} from "three/addons/shaders/SMAAShader.js";

import { leanMaterial } from "./lean-shaders";
import type { Quality } from "./runtime";

/*
 * The effects every full-tier scene is drawn through: depth of field, bloom
 * (studio rim glow), tone mapping, film grain and SMAA, on every device.
 *
 * It looks the same as the three.js pass chain it replaced (BokehPass,
 * UnrealBloomPass, OutputPass, SMAAPass and a grain pass) but draws the scene
 * once a frame instead of three times:
 *
 * - Depth of field reads the depth buffer of the one scene render. BokehPass
 *   drew the whole scene again for its depth.
 * - Glass (materials with `transmission`) refracts a copy of the scene taken
 *   just before the first glass is drawn, when it holds what three.js's own
 *   glass pass would draw: the background and every opaque object. three.js
 *   drew all of them a second time for that, with 4× multisampling.
 * - Depth of field, the bloom, tone mapping and grain share one full-screen
 *   pass, and the depth of field takes only the taps a pixel's blur needs
 *   (below).
 */

type Tap = readonly [number, number];

/** BokehShader's 41 taps are the centre and these, in its `dofblur` units. */
// prettier-ignore
const RING: ReadonlyArray<Tap> = [
  [0, 0.4], [0.15, 0.37], [0.29, 0.29], [-0.37, 0.15],
  [0.4, 0], [0.37, -0.15], [0.29, -0.29], [-0.15, -0.37],
  [0, -0.4], [-0.15, 0.37], [-0.29, 0.29], [0.37, 0.15],
  [-0.4, 0], [-0.37, -0.15], [-0.29, -0.29], [0.15, -0.37],
];
// prettier-ignore
const ODD: ReadonlyArray<Tap> = [
  [0.15, 0.37], [-0.37, 0.15], [0.37, -0.15], [-0.15, -0.37],
  [-0.15, 0.37], [0.37, 0.15], [-0.37, -0.15], [0.15, -0.37],
];
// prettier-ignore
const EVEN: ReadonlyArray<Tap> = [
  [0.29, 0.29], [0.4, 0], [0.29, -0.29], [0, -0.4],
  [-0.29, 0.29], [-0.4, 0], [-0.29, -0.29], [0, 0.4],
];

/**
 * Two taps in one direction, at `a` and `b` of the blur, as one tap of twice
 * the weight at their root-mean-square distance, which keeps their spread.
 */
const merge = (taps: ReadonlyArray<Tap>, a: number, b: number) => {
  const k = Math.sqrt((a * a + b * b) / 2);
  return taps.map(([x, y]): Tap => [x * k, y * k]);
};

/** The depth of field's taps; the unit test reads BokehShader's out of it. */
export const DOF_TAPS = {
  /** At the full blur. */
  ring: RING,
  /** At 0.9 of the blur. */
  odd: ODD,
  /** At 0.7 of the blur, and again at 0.4. */
  even: EVEN,
  /**
   * The 25-tap kernel's double-weight taps, each merging two of the 41 that
   * share a direction. Its single-weight taps are the centre and `even`.
   */
  paired: [...merge(EVEN, 0.7, 0.4), ...merge(ODD, 1, 0.9)],
  /** The 9-tap kernel's 8 directions around the centre. */
  circle: Array.from({ length: 8 }, (_, i): Tap => {
    const angle = (Math.PI * 2 * i) / 8;
    return [
      Number(Math.cos(angle).toFixed(6)),
      Number(Math.sin(angle).toFixed(6)),
    ];
  }),
};

/**
 * Where each depth-of-field kernel takes over, by how far a pixel's blur
 * reaches (`|dofblur|` times the image width, in pixels). Each cheaper kernel
 * stays within 2% (L1) of the 41-tap one over its range, less than the grain
 * moves a pixel (checked in the unit test).
 */
export const DOF_TIERS = { single: 0.05, ring: 2.91, merged: 3.6 } as const;

/**
 * The 9-tap kernel's radius and centre weight, fitted to the 41 taps: fixed
 * up to `start` pixels of blur, then widening toward the 25-tap kernel.
 */
export const DOF_RING_FIT = {
  start: 2.4,
  span: 0.6,
  radius: 0.408,
  radiusSlope: -0.068,
  centre: 0.2,
  centreSlope: -0.125,
} as const;

/** The 9-tap kernel for a blur reaching `reach` pixels, as the shader works it out. */
export function dofRing(reach: number) {
  const f = DOF_RING_FIT;
  const t = Math.min(Math.max(reach - f.start, 0), f.span);
  return {
    radius: f.radius + f.radiusSlope * t,
    centreWeight: f.centre + f.centreSlope * t,
  };
}

const glslNumber = (n: number) =>
  Number.isInteger(n) ? n.toFixed(1) : String(n);
const glslTaps = (name: string, taps: ReadonlyArray<Tap>) =>
  `const vec2 ${name}[${taps.length}] = vec2[${taps.length}](${taps
    .map(([x, y]) => `vec2(${glslNumber(x)}, ${glslNumber(y)})`)
    .join(", ")});`;

/**
 * BokehShader's depth of field, `depthOfField(uv)`, for the scene image
 * `tColor` and its depth `tDepth`. Sharp pixels take one tap; the 9- and
 * 25-tap kernels stand in for the 41 taps where they look the same.
 */
const DOF_GLSL = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform float focus;
  uniform float aperture;
  uniform float maxblur;
  uniform float nearClip;
  uniform float farClip;
  uniform float aspect;
  uniform float bufferWidth;

  ${glslTaps("DOF_RING", DOF_TAPS.ring)}
  ${glslTaps("DOF_ODD", DOF_TAPS.odd)}
  ${glslTaps("DOF_EVEN", DOF_TAPS.even)}
  ${glslTaps("DOF_PAIRED", DOF_TAPS.paired)}
  ${glslTaps("DOF_CIRCLE", DOF_TAPS.circle)}

  vec3 tapColor( vec2 uv ) { return textureLod( tColor, uv, 0.0 ).rgb; }

  vec3 depthOfField( vec2 uv ) {
    float viewZ = perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, nearClip, farClip );
    float blur = clamp( ( focus + viewZ ) * aperture, -maxblur, maxblur );
    float reach = abs( blur ) * bufferWidth;
    vec2 s = vec2( 1.0, aspect ) * blur;
    vec3 centre = tapColor( uv );
    if ( reach < ${glslNumber(DOF_TIERS.single)} ) return centre;
    if ( reach <= ${glslNumber(DOF_TIERS.ring)} ) {
      float t = clamp( reach - ${glslNumber(DOF_RING_FIT.start)}, 0.0, ${glslNumber(DOF_RING_FIT.span)} );
      float radius = ${glslNumber(DOF_RING_FIT.radius)} + ${glslNumber(DOF_RING_FIT.radiusSlope)} * t;
      float centreWeight = ${glslNumber(DOF_RING_FIT.centre)} + ${glslNumber(DOF_RING_FIT.centreSlope)} * t;
      vec3 ring = vec3( 0.0 );
      for ( int i = 0; i < 8; i ++ ) ring += tapColor( uv + DOF_CIRCLE[ i ] * radius * s );
      return centre * centreWeight + ring * ( ( 1.0 - centreWeight ) / 8.0 );
    }
    if ( reach <= ${glslNumber(DOF_TIERS.merged)} ) {
      vec3 single = centre;
      vec3 paired = vec3( 0.0 );
      for ( int i = 0; i < 8; i ++ ) single += tapColor( uv + DOF_EVEN[ i ] * s );
      for ( int i = 0; i < 16; i ++ ) paired += tapColor( uv + DOF_PAIRED[ i ] * s );
      return ( single + 2.0 * paired ) / 41.0;
    }
    vec3 sum = centre;
    for ( int i = 0; i < 16; i ++ ) sum += tapColor( uv + DOF_RING[ i ] * s );
    for ( int i = 0; i < 8; i ++ ) sum += tapColor( uv + DOF_ODD[ i ] * s * 0.9 );
    for ( int i = 0; i < 8; i ++ ) {
      sum += tapColor( uv + DOF_EVEN[ i ] * s * 0.7 );
      sum += tapColor( uv + DOF_EVEN[ i ] * s * 0.4 );
    }
    return sum / 41.0;
  }`;

const FULL_SCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`;

/** Bloom's bright pass (UnrealBloomPass's high pass) on the blurred image. */
const BRIGHT_FRAGMENT = /* glsl */ `
  #include <common>
  #include <packing>
  uniform float threshold;
  varying vec2 vUv;
  ${DOF_GLSL}
  void main() {
    vec3 color = depthOfField( vUv );
    float alpha = smoothstep( threshold, threshold + 0.01, luminance( color ) );
    gl_FragColor = mix( vec4( 0.0 ), vec4( color, 1.0 ), alpha );
  }`;

/**
 * Depth of field plus bloom, then OutputPass's tone mapping and sRGB
 * encoding, then film grain, mostly in the mid-tones as on film. The grain
 * goes on before the 8-bit store, where it also dithers away banding.
 */
const COMPOSITE_FRAGMENT = /* glsl */ `
  #include <common>
  #include <packing>
  #include <tonemapping_pars_fragment>
  uniform sampler2D tBloom;
  uniform float uTime;
  uniform float uAmount;
  varying vec2 vUv;
  ${DOF_GLSL}
  float hash( vec2 p ) { p = fract( p * vec2( 443.897, 441.423 ) ); p += dot( p, p.yx + 19.19 ); return fract( ( p.x + p.y ) * p.x ); }
  void main() {
    vec4 color = vec4( depthOfField( vUv ) + texture2D( tBloom, vUv ).rgb, 1.0 );
    #if defined( LINEAR_TONE_MAPPING )
      color.rgb = LinearToneMapping( color.rgb );
    #elif defined( REINHARD_TONE_MAPPING )
      color.rgb = ReinhardToneMapping( color.rgb );
    #elif defined( CINEON_TONE_MAPPING )
      color.rgb = CineonToneMapping( color.rgb );
    #elif defined( ACES_FILMIC_TONE_MAPPING )
      color.rgb = ACESFilmicToneMapping( color.rgb );
    #elif defined( AGX_TONE_MAPPING )
      color.rgb = AgXToneMapping( color.rgb );
    #elif defined( NEUTRAL_TONE_MAPPING )
      color.rgb = NeutralToneMapping( color.rgb );
    #elif defined( CUSTOM_TONE_MAPPING )
      color.rgb = CustomToneMapping( color.rgb );
    #endif
    #ifdef SRGB_TRANSFER
      color = sRGBTransferOETF( color );
    #endif
    float l = dot( color.rgb, vec3( 0.299, 0.587, 0.114 ) );
    float g = hash( vUv * 1024.0 + fract( uTime ) * 97.0 ) - 0.5;
    color.rgb += g * uAmount * ( 1.0 - abs( l - 0.45 ) * 1.4 );
    gl_FragColor = color;
  }`;

const COPY_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D( tDiffuse, vUv ); }`;

const TONE_MAPPING_DEFINES = new Map<THREE.ToneMapping, string>([
  [THREE.LinearToneMapping, "LINEAR_TONE_MAPPING"],
  [THREE.ReinhardToneMapping, "REINHARD_TONE_MAPPING"],
  [THREE.CineonToneMapping, "CINEON_TONE_MAPPING"],
  [THREE.ACESFilmicToneMapping, "ACES_FILMIC_TONE_MAPPING"],
  [THREE.AgXToneMapping, "AGX_TONE_MAPPING"],
  [THREE.NeutralToneMapping, "NEUTRAL_TONE_MAPPING"],
  [THREE.CustomToneMapping, "CUSTOM_TONE_MAPPING"],
]);

const TRANSMISSION_INCLUDE = "#include <transmission_pars_fragment>";
/** three.js's glass code, reading the copy of the scene instead of its own. */
export const POST_TRANSMISSION_CHUNK =
  THREE.ShaderChunk.transmission_pars_fragment
    .replaceAll("transmissionSamplerMap", "postTransmissionMap")
    .replaceAll("transmissionSamplerSize", "postTransmissionSize");

type TransmissionUniforms = {
  postTransmissionMap: THREE.IUniform<THREE.Texture | null>;
  postTransmissionSize: THREE.IUniform<THREE.Vector2>;
};

/** The effects running on each renderer, for the glass materials to find. */
const activePosts = new WeakMap<
  THREE.WebGLRenderer,
  { beforeGlass(uniforms: TransmissionUniforms): void }
>();
const patchedMaterials = new WeakSet<THREE.Material>();

/**
 * Points a glass material at the effects' copy of the scene. The change only
 * applies on a renderer drawing through these effects, so the same material
 * still works in a scene drawn without them.
 */
function patchGlass(material: THREE.MeshPhysicalMaterial) {
  if (patchedMaterials.has(material)) return;
  patchedMaterials.add(material);
  const uniforms: TransmissionUniforms = {
    postTransmissionMap: { value: null },
    postTransmissionSize: { value: new THREE.Vector2(1, 1) },
  };
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey;
  const beforeRender = material.onBeforeRender;
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    if (!activePosts.has(renderer)) return;
    if (!shader.fragmentShader.includes(TRANSMISSION_INCLUDE)) {
      throw new Error(
        "The glass shader no longer includes transmission_pars_fragment; update engine/post.ts for this three.js version.",
      );
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      TRANSMISSION_INCLUDE,
      POST_TRANSMISSION_CHUNK,
    );
    Object.assign(shader.uniforms, uniforms);
  };
  // three.js tells shaders apart by this key; by default it is the text of
  // onBeforeCompile, which is now the same wrapper on every glass material
  material.customProgramCacheKey = () =>
    `${
      cacheKey === THREE.Material.prototype.customProgramCacheKey
        ? compile.toString()
        : cacheKey.call(material)
    }|post-glass`;
  material.onBeforeRender = (
    renderer,
    scene,
    camera,
    geometry,
    object,
    group,
  ) => {
    beforeRender.call(
      material,
      renderer,
      scene,
      camera,
      geometry,
      object,
      group,
    );
    activePosts.get(renderer)?.beforeGlass(uniforms);
  };
  material.needsUpdate = true;
}

function patchObject(object: THREE.Object3D) {
  const material = (object as THREE.Mesh).material;
  if (!material) return;
  for (const m of Array.isArray(material) ? material : [material]) {
    leanMaterial(m, object);
    const physical = m as THREE.MeshPhysicalMaterial;
    if (physical.isMeshPhysicalMaterial && physical.transmission > 0)
      patchGlass(physical);
  }
}

/** SMAA's two lookup images, as SMAAPass loads them. */
function smaaLookups() {
  const pass = SMAAPass.prototype as unknown as {
    _getAreaTexture?: () => string;
    _getSearchTexture?: () => string;
  };
  if (
    typeof pass._getAreaTexture !== "function" ||
    typeof pass._getSearchTexture !== "function"
  ) {
    throw new Error(
      "SMAAPass no longer has its lookup images; update engine/post.ts for this three.js version.",
    );
  }
  const load = (source: string, filter: THREE.MagnificationTextureFilter) => {
    const image = new Image();
    const texture = new THREE.Texture(image);
    texture.minFilter = filter;
    texture.magFilter = filter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    image.onload = () => {
      texture.needsUpdate = true;
    };
    image.src = source;
    // decoded before the scene shows, so SMAA never runs a frame without them
    const ready = image.decode().then(
      () => {
        texture.needsUpdate = true;
      },
      () => undefined,
    );
    return { texture, ready };
  };
  return {
    area: load(pass._getAreaTexture(), THREE.LinearFilter),
    search: load(pass._getSearchTexture(), THREE.NearestFilter),
  };
}

export type Post = ReturnType<typeof makePost>;

export function makePost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  quality: Quality,
  options: {
    focus: number;
    aperture?: number;
    bloom?: number;
    /** Size of the scene copy the glass refracts, against the canvas. */
    transmissionScale?: number;
  } = { focus: 10 },
) {
  const transmissionScale =
    options.transmissionScale ?? (quality.mobile ? 0.5 : 1);
  // Edges are smoothed by SMAA after tone mapping, not by multisampling the
  // scene's half-float target: 4× MSAA there cost an integrated laptop GPU
  // more than half its frame rate (22 → 46 fps on Home, 18 → 35 on Menu,
  // Intel UHD at 1080p) for edges that look the same.
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 0,
    depthTexture: new THREE.DepthTexture(1, 1),
  });
  const glassTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const ldrTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const edgesTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    format: THREE.RGFormat,
  });
  const weightsTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false,
  });

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(256, 256),
    options.bloom ?? (quality.mobile ? 0.32 : 0.4),
    0.55,
    // above the cream studio wall (about 1.9 before tone mapping), so only
    // highlights on glass and ice bloom, not the whole light background
    2.2,
  );
  const blurX = new THREE.Vector2(1, 0);
  const blurY = new THREE.Vector2(0, 1);

  const fullScreen = (parameters: THREE.ShaderMaterialParameters) =>
    new THREE.ShaderMaterial({
      vertexShader: FULL_SCREEN_VERTEX,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      ...parameters,
    });
  const dof = {
    tColor: { value: sceneTarget.texture },
    tDepth: { value: sceneTarget.depthTexture },
    focus: { value: options.focus },
    aperture: { value: options.aperture ?? 0.00055 },
    maxblur: { value: 0.0045 },
    nearClip: { value: camera.near },
    farClip: { value: camera.far },
    aspect: { value: 1 },
    bufferWidth: { value: 1 },
  };
  const bright = fullScreen({
    uniforms: { ...dof, threshold: { value: bloom.threshold } },
    fragmentShader: BRIGHT_FRAGMENT,
  });
  const composite = fullScreen({
    uniforms: {
      ...dof,
      tBloom: { value: bloom.renderTargetsHorizontal[0]!.texture },
      toneMappingExposure: { value: 1 },
      uTime: { value: 0 },
      uAmount: { value: 0.035 },
    },
    fragmentShader: COMPOSITE_FRAGMENT,
  });
  const copy = fullScreen({
    uniforms: { tDiffuse: { value: sceneTarget.texture } },
    fragmentShader: COPY_FRAGMENT,
  });
  const lookups = smaaLookups();
  const smaa = (
    shader:
      | typeof SMAAEdgesShader
      | typeof SMAAWeightsShader
      | typeof SMAABlendShader,
  ) =>
    fullScreen({
      defines: { ...("defines" in shader ? shader.defines : {}) },
      uniforms: THREE.UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    });
  const edges = smaa(SMAAEdgesShader);
  edges.uniforms.tDiffuse!.value = ldrTarget.texture;
  const weights = smaa(SMAAWeightsShader);
  weights.uniforms.tDiffuse!.value = edgesTarget.texture;
  weights.uniforms.tArea!.value = lookups.area.texture;
  weights.uniforms.tSearch!.value = lookups.search.texture;
  const blend = smaa(SMAABlendShader);
  blend.uniforms.tDiffuse!.value = weightsTarget.texture;
  blend.uniforms.tColor!.value = ldrTarget.texture;

  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3),
  );
  triangle.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2),
  );
  const quad = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(
    triangle,
    copy,
  );
  quad.frustumCulled = false;
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const draw = (
    material: THREE.Material,
    target: THREE.WebGLRenderTarget | null,
  ) => {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quad, quadCamera);
  };

  let outputKey = "";
  const updateOutput = () => {
    const key = `${renderer.outputColorSpace}|${renderer.toneMapping}`;
    if (key === outputKey) return;
    outputKey = key;
    const defines: Record<string, string> = {};
    if (
      THREE.ColorManagement.getTransfer(renderer.outputColorSpace) ===
      THREE.SRGBTransfer
    ) {
      defines.SRGB_TRANSFER = "";
    }
    const toneMapping = TONE_MAPPING_DEFINES.get(renderer.toneMapping);
    if (toneMapping) defines[toneMapping] = "";
    composite.defines = defines;
    composite.needsUpdate = true;
  };

  // three.js draws every opaque object again for the glass, before the
  // scene. While the scene draws, that pass gets a camera that sees nothing
  // and a target a few pixels wide: the glass reads the copy below instead.
  const setRenderTarget = renderer.setRenderTarget;
  const glassScale = renderer.transmissionResolutionScale;
  let drawingScene = false;
  let copyPending = false;
  let hiddenMask: number | null = null;
  const showCamera = () => {
    if (hiddenMask === null) return;
    camera.layers.mask = hiddenMask;
    hiddenMask = null;
  };
  renderer.setRenderTarget = (target, activeCubeFace, activeMipmapLevel) => {
    showCamera();
    // three.js's own glass target: multisampled, mipmapped, trilinear
    const texture = target?.textures[0] as THREE.Texture | undefined;
    if (
      drawingScene &&
      target &&
      target !== sceneTarget &&
      target !== glassTarget &&
      target.samples >= 4 &&
      texture?.generateMipmaps &&
      texture.minFilter === THREE.LinearMipmapLinearFilter
    ) {
      hiddenMask = camera.layers.mask;
      camera.layers.mask = 0;
    }
    setRenderTarget.call(renderer, target, activeCubeFace, activeMipmapLevel);
  };
  activePosts.set(renderer, {
    beforeGlass(uniforms) {
      uniforms.postTransmissionMap.value = glassTarget.texture;
      uniforms.postTransmissionSize.value.set(
        glassTarget.width,
        glassTarget.height,
      );
      if (!copyPending || renderer.getRenderTarget() !== sceneTarget) return;
      // the first glass object: the target holds the background and every
      // opaque object, and nothing else yet
      copyPending = false;
      draw(copy, glassTarget);
      renderer.setRenderTarget(sceneTarget);
    },
  });
  scene.traverse(patchObject);

  const clearColor = new THREE.Color();
  let glow = true;
  return {
    /** A slow device's step: no depth of field, every pixel one tap. */
    dropDepthOfField() {
      dof.aperture.value = 0;
    },
    /** A slow device's last step: no depth of field and no glow. */
    degrade() {
      dof.aperture.value = 0;
      glow = false;
    },
    /** Call after `renderer.setSize`, with the same size. */
    setSize(width: number, height: number) {
      const w = Math.max(1, Math.floor(width * renderer.getPixelRatio()));
      const h = Math.max(1, Math.floor(height * renderer.getPixelRatio()));
      sceneTarget.setSize(w, h);
      glassTarget.setSize(
        Math.max(1, Math.floor(w * transmissionScale)),
        Math.max(1, Math.floor(h * transmissionScale)),
      );
      bloom.setSize(w, h);
      ldrTarget.setSize(w, h);
      edgesTarget.setSize(w, h);
      weightsTarget.setSize(w, h);
      dof.aspect.value = w / h;
      dof.bufferWidth.value = w;
      for (const material of [edges, weights, blend]) {
        (material.uniforms.resolution!.value as THREE.Vector2).set(
          1 / w,
          1 / h,
        );
      }
      renderer.transmissionResolutionScale = Math.min(1, 8 / Math.min(w, h));
    },
    /**
     * Compiles every material in the scene, hidden objects included, and the
     * effects' own, each for the target it draws to. Where the browser
     * compiles shaders in parallel this doesn't block the page. Scenes await
     * it before they show, so bringing in the next product never stalls a
     * scroll on a shader compile.
     */
    async precompile() {
      scene.traverse(patchObject);
      updateOutput();
      const ready: Array<Promise<unknown>> = [
        lookups.area.ready,
        lookups.search.ready,
      ];
      const compile = (
        target: THREE.WebGLRenderTarget | null,
        object: THREE.Object3D,
        view: THREE.Camera,
      ) => {
        setRenderTarget.call(renderer, target);
        ready.push(renderer.compileAsync(object, view));
      };
      compile(sceneTarget, scene, camera);
      const passes: Array<[THREE.Material, THREE.WebGLRenderTarget | null]> = [
        [copy, glassTarget],
        [bright, bloom.renderTargetBright],
        ...bloom.separableBlurMaterials.map(
          (material, i) =>
            [material, bloom.renderTargetsVertical[i]!] as [
              THREE.Material,
              THREE.WebGLRenderTarget,
            ],
        ),
        [bloom.compositeMaterial, bloom.renderTargetsHorizontal[0]!],
        [composite, ldrTarget],
        [edges, edgesTarget],
        [weights, weightsTarget],
        [blend, null],
      ];
      for (const [material, target] of passes) {
        quad.material = material;
        compile(target, quad, quadCamera);
      }
      setRenderTarget.call(renderer, null);
      await Promise.all(ready);
    },
    render(_dt: number, time: number) {
      scene.traverseVisible(patchObject);
      updateOutput();
      const autoClear = renderer.autoClear;
      const clearAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clearColor);
      renderer.autoClear = true;
      try {
        renderer.setRenderTarget(sceneTarget);
        drawingScene = true;
        copyPending = true;
        try {
          renderer.render(scene, camera);
        } finally {
          drawingScene = false;
          copyPending = false;
          showCamera();
        }

        renderer.setClearColor(0x000000, 0);
        dof.nearClip.value = camera.near;
        dof.farClip.value = camera.far;
        bright.uniforms.threshold!.value = bloom.threshold;
        if (glow) {
          draw(bright, bloom.renderTargetBright);
          let input = bloom.renderTargetBright;
          for (let i = 0; i < bloom.nMips; i++) {
            const blur = bloom.separableBlurMaterials[i]!;
            const horizontal = bloom.renderTargetsHorizontal[i]!;
            const vertical = bloom.renderTargetsVertical[i]!;
            blur.uniforms.colorTexture!.value = input.texture;
            blur.uniforms.direction!.value = blurX;
            draw(blur, horizontal);
            blur.uniforms.colorTexture!.value = horizontal.texture;
            blur.uniforms.direction!.value = blurY;
            draw(blur, vertical);
            input = vertical;
          }
        }
        // without the glow, the strength zeroes what the skipped passes left
        bloom.compositeMaterial.uniforms.bloomStrength!.value = glow
          ? bloom.strength
          : 0;
        bloom.compositeMaterial.uniforms.bloomRadius!.value = bloom.radius;
        bloom.compositeMaterial.uniforms.bloomTintColors!.value =
          bloom.bloomTintColors;
        draw(bloom.compositeMaterial, bloom.renderTargetsHorizontal[0]!);

        composite.uniforms.toneMappingExposure!.value =
          renderer.toneMappingExposure;
        composite.uniforms.uTime!.value = time;
        draw(composite, ldrTarget);
        draw(edges, edgesTarget);
        draw(weights, weightsTarget);
        draw(blend, null);
      } finally {
        renderer.setClearColor(clearColor, clearAlpha);
        renderer.autoClear = autoClear;
      }
    },
    dispose() {
      renderer.setRenderTarget = setRenderTarget;
      renderer.transmissionResolutionScale = glassScale;
      activePosts.delete(renderer);
      sceneTarget.depthTexture?.dispose();
      for (const target of [
        sceneTarget,
        glassTarget,
        ldrTarget,
        edgesTarget,
        weightsTarget,
      ]) {
        target.dispose();
      }
      bloom.dispose();
      for (const material of [bright, composite, copy, edges, weights, blend])
        material.dispose();
      lookups.area.texture.dispose();
      lookups.search.texture.dispose();
      triangle.dispose();
    },
  };
}
