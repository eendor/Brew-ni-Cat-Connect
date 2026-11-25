import * as THREE from "three";

/*
 * Leaner shaders for the lit materials (MeshStandardMaterial and
 * MeshPhysicalMaterial) that draw exactly the same pixels.
 *
 * On a phone GPU (the Mali-G76 in a Redmi Note 10S) three.js's physical
 * shader needs more registers than the GPU has. It spills values to memory,
 * and every pixel waits on those loads. These rewrites cut what the shader
 * keeps alive without changing a result:
 *
 * - Lights with no shadow and no light map run in a real loop instead of one
 *   copy of the lighting code per light. A shadowed light keeps its own copy,
 *   since its shadow map has to be picked by a constant index.
 * - A light behind the surface (and behind the clearcoat, which has a normal
 *   of its own) is skipped: everything it would add is multiplied by zero.
 * - The environment lookup asks for the one image level the environment map
 *   has (`textureLod`), instead of the same level by zero gradients
 *   (`textureGrad`), which a Mali GPU samples at a slower rate.
 * - Values a material leaves at their defaults (no metal, no glow, the
 *   standard specular), "receives no shadow" and "seen by a perspective
 *   camera" are constants in the shader instead of uniforms, so the compiler
 *   drops the work they would switch off anyway. A material gets new
 *   shaders when one of those values changes.
 *
 * The rewrites of three.js's own shader code apply only where that code is
 * found exactly once, so after a three.js update that changes it the
 * materials keep three.js's shaders, and a unit test that compares the code
 * with the copy these rewrites expect fails.
 */

/** Unrolled loop over one kind of light, in `lights_fragment_begin`. */
const lightLoop = (count: string) =>
  new RegExp(
    String.raw`#pragma unroll_loop_start\s+for \( int i = 0; i < ${count}; i \+\+ \) \{[\s\S]+?\}\s+#pragma unroll_loop_end`,
  );

const DIRECT = `RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );`;

/**
 * One light's shading, skipped where all it adds is zero: everything but the
 * clearcoat is multiplied by the light's angle to the surface, which is zero
 * behind it, and the clearcoat by its angle to the clearcoat's own normal.
 */
const LIT = `if ( LEAN_REACHES( directLight ) ) {
		${DIRECT}
	}`;

const REACHES = `#ifdef USE_CLEARCOAT
	#define LEAN_REACHES( light ) ( dot( geometryNormal, light.direction ) > 0.0 || dot( geometryClearcoatNormal, light.direction ) > 0.0 )
#else
	#define LEAN_REACHES( light ) ( dot( geometryNormal, light.direction ) > 0.0 )
#endif
`;

/** Each rewrite as [what it replaces, what replaces it]. `$&` is the original. */
type Rewrite = readonly [RegExp | string, string];

const LIGHT_LOOPS: ReadonlyArray<Rewrite> = [
  [
    lightLoop("NUM_POINT_LIGHTS"),
    `#if defined( USE_SHADOWMAP ) && ( NUM_POINT_LIGHT_SHADOWS > 0 ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	$&
	#else
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		${LIT}
	}
	#endif`,
  ],
  [
    lightLoop("NUM_SPOT_LIGHTS"),
    `#if ( NUM_SPOT_LIGHT_SHADOWS == 0 ) && ( NUM_SPOT_LIGHT_MAPS == 0 )
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		${LIT}
	}
	#else
	$&
	#endif`,
  ],
  // three.js puts the lights that cast shadows first
  [
    lightLoop("NUM_DIR_LIGHTS"),
    `#if defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 )
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		${LIT}
	}
	#pragma unroll_loop_end
	for ( int i = NUM_DIR_LIGHT_SHADOWS; i < NUM_DIR_LIGHTS; i ++ ) {
	#else
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
	#endif
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		${LIT}
	}`,
  ],
];

/** three.js's light code with each light's shading skipped where it adds nothing. */
const skipDarkLights = (text: string) =>
  text.includes(DIRECT) ? REACHES + text.replaceAll(DIRECT, LIT) : null;

const ENV_LOOKUP: ReadonlyArray<Rewrite> = [
  // the PMREM environment map has one level and no anisotropy
  [
    "texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) )",
    "textureLod( envMap, uv, 0.0 )",
  ],
];

const count = (text: string, pattern: RegExp | string) =>
  typeof pattern === "string"
    ? text.split(pattern).length - 1
    : (text.match(new RegExp(pattern.source, "g")) ?? []).length;

/** `text` with each rewrite made once, or null if one no longer matches once. */
function rewrite(text: string | null, rewrites: ReadonlyArray<Rewrite>) {
  if (text === null) return null;
  let out = text;
  for (const [from, to] of rewrites) {
    if (count(out, from) !== 1) return null;
    out = out.replace(from, to);
  }
  return out;
}

/** three.js's chunks with the rewrites, or null where they no longer apply. */
export const LEAN_CHUNKS = {
  lights: rewrite(
    skipDarkLights(THREE.ShaderChunk.lights_fragment_begin),
    LIGHT_LOOPS,
  ),
  environment: rewrite(
    THREE.ShaderChunk.cube_uv_reflection_fragment,
    ENV_LOOKUP,
  ),
};

/** What a material's shader takes as constants, as bits. */
export const LEAN = {
  /** `metalness` is 0 */
  noMetal: 1,
  /** `emissive` is black, or `emissiveIntensity` 0 */
  noGlow: 2,
  /** a physical material's specular is the default: intensity 1, white */
  plainSpecular: 4,
  /** no mesh drawn with it receives shadows */
  noShadow: 8,
  /** no orthographic camera draws it */
  perspective: 16,
} as const;

/** Each constant as [declaration it replaces, replacement]. */
const CONSTANTS: ReadonlyArray<readonly [number, ReadonlyArray<Rewrite>]> = [
  [
    LEAN.noMetal,
    [["uniform float metalness;", "const float metalness = 0.0;"]],
  ],
  [
    LEAN.noGlow,
    [["uniform vec3 emissive;", "const vec3 emissive = vec3( 0.0 );"]],
  ],
  [
    LEAN.plainSpecular,
    [
      [
        "uniform float specularIntensity;",
        "const float specularIntensity = 1.0;",
      ],
      [
        "uniform vec3 specularColor;",
        "const vec3 specularColor = vec3( 1.0 );",
      ],
    ],
  ],
  // both are declared before the material's own code (receiveShadow in this
  // chunk, isOrthographic ahead of the whole shader), so a macro after the
  // declaration turns every use into the constant
  [
    LEAN.noShadow,
    [
      [
        "#include <lights_pars_begin>",
        "#include <lights_pars_begin>\n#define receiveShadow false",
      ],
    ],
  ],
];

type State = {
  /** the bits of the shader three.js last picked for the material */
  key: number;
  /** a mesh drawn with the material receives shadows */
  receivers: boolean;
  /** an orthographic camera drew the material */
  orthographic: boolean;
};

const states = new WeakMap<THREE.Material, State>();

const isBlack = (color: THREE.Color) =>
  color.r === 0 && color.g === 0 && color.b === 0;

function bitsOf(material: THREE.MeshStandardMaterial, state: State) {
  let bits = 0;
  if (material.metalness === 0) bits |= LEAN.noMetal;
  if (isBlack(material.emissive) || material.emissiveIntensity === 0)
    bits |= LEAN.noGlow;
  const physical = material as THREE.MeshPhysicalMaterial;
  if (
    physical.isMeshPhysicalMaterial &&
    physical.specularIntensity === 1 &&
    physical.specularColor.r === 1 &&
    physical.specularColor.g === 1 &&
    physical.specularColor.b === 1
  )
    bits |= LEAN.plainSpecular;
  if (!state.receivers) bits |= LEAN.noShadow;
  if (!state.orthographic) bits |= LEAN.perspective;
  return bits;
}

/** A lit material's fragment shader, before includes, with the rewrites. */
export function leanFragment(source: string, bits: number) {
  let out = source;
  const swap = (from: string, to: string | null) => {
    if (to !== null && count(out, from) === 1)
      out = out.replace(from, () => to);
  };
  swap("#include <lights_fragment_begin>", LEAN_CHUNKS.lights);
  swap("#include <cube_uv_reflection_fragment>", LEAN_CHUNKS.environment);
  for (const [bit, rewrites] of CONSTANTS) {
    if (!(bits & bit)) continue;
    for (const [from, to] of rewrites) swap(from as string, to);
  }
  if (bits & LEAN.perspective) out = `#define isOrthographic false\n${out}`;
  return out;
}

/**
 * Gives a lit material the leaner shaders. `mesh` is drawn with it, so a mesh
 * that receives shadows is known before the first shader is made.
 */
export function leanMaterial(material: THREE.Material, mesh: THREE.Object3D) {
  const lit = material as THREE.MeshStandardMaterial;
  if (!lit.isMeshStandardMaterial) return;
  const known = states.get(material);
  if (known) {
    if (mesh.receiveShadow && !known.receivers) {
      known.receivers = true;
      material.needsUpdate = true;
    }
    return;
  }
  const state: State = {
    key: -1,
    receivers: mesh.receiveShadow,
    orthographic: false,
  };
  states.set(material, state);
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey;
  const beforeRender = material.onBeforeRender;
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    shader.fragmentShader = leanFragment(shader.fragmentShader, state.key);
  };
  // three.js asks for the key before it makes a shader, and makes one for
  // each key it has not seen: so the key carries the constants, and the
  // shader is made for the key just given
  material.customProgramCacheKey = () => {
    state.key = bitsOf(lit, state);
    return `${
      cacheKey === THREE.Material.prototype.customProgramCacheKey
        ? compile.toString()
        : cacheKey.call(material)
    }|lean${state.key}`;
  };
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
    if (object.receiveShadow) state.receivers = true;
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera)
      state.orthographic = true;
    // a value baked into the shader changed: three.js picks the shader again
    // before this draw
    if (bitsOf(lit, state) !== state.key) material.needsUpdate = true;
  };
  material.needsUpdate = true;
}
