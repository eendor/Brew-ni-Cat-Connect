import * as THREE from "three";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import type { Quality } from "./runtime";

/** Fine luminance grain applied after tone mapping, like a camera sensor. */
const GrainShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uAmount: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uAmount; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float g = hash(vUv * 1024.0 + fract(uTime) * 97.0) - 0.5;
      // grain sits mostly in the mid-tones, as on film
      c.rgb += g * uAmount * (1.0 - abs(l - 0.45) * 1.4);
      gl_FragColor = c;
    }`,
};

export type Post = ReturnType<typeof makePost>;

/**
 * Render → subtle depth of field → bloom (studio rim glow) → tone mapping
 * → grain. DOF and bloom drop out on mobile or when frames run slow.
 */
export function makePost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  quality: Quality,
  options: { focus: number; aperture?: number; bloom?: number } = { focus: 10 },
) {
  // MSAA on the composer targets: without it, edges of refracting ice and
  // cups alias once post-processing takes over from the canvas antialias
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: quality.mobile ? 0 : 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, {
    focus: options.focus,
    aperture: options.aperture ?? 0.00055,
    maxblur: 0.0045,
  });
  bokeh.enabled = !quality.mobile;
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(256, 256),
    options.bloom ?? (quality.mobile ? 0.32 : 0.4),
    0.55,
    0.9,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass(GrainShader);
  composer.addPass(grain);

  return {
    composer,
    bloom,
    bokeh,
    grain,
    setSize(width: number, height: number) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      bloom.resolution.set(width / 2, height / 2);
    },
    degrade() {
      bokeh.enabled = false;
      bloom.enabled = false;
    },
    /**
     * Compiles every material in the scene, hidden objects included, for
     * the composer's render target (the state the real frames render in).
     * Where the browser compiles shaders in parallel this doesn't block the
     * page. Scenes await it before they show, so bringing in the next
     * product never stalls a scroll on a shader compile.
     */
    async precompile() {
      renderer.setRenderTarget(composer.readBuffer);
      const ready = renderer.compileAsync(scene, camera);
      renderer.setRenderTarget(null);
      await ready;
    },
    render(dt: number, time: number) {
      grain.uniforms.uTime!.value = time;
      composer.render(dt);
    },
    dispose() {
      composer.dispose();
    },
  };
}
