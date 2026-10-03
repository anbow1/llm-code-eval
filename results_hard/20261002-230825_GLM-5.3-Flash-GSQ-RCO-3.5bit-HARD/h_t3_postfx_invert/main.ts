import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------- Post-processing ----------
// Color space reasoning:
// - EffectComposer's render targets are LINEAR (no automatic sRGB conversion
//   happens between passes). Three stores scene colors (0x336699 background,
//   white sphere) converted sRGB -> linear, so RenderPass output is linear.
// - OutputPass performs the final linear -> sRGB conversion for the screen.
// - We want on-screen = exact inverse of the on-screen colors without the
//   effect, i.e. screen_out = 1.0 - screen_orig = 1.0 - linearToSRGB(linear_in).
//   Since the pass buffers are linear, the inversion MUST be done in sRGB
//   space: convert linear -> sRGB, invert, convert back to linear, and let
//   OutputPass do its normal linear -> sRGB at the end. Round-tripping through
//   the exact piecewise sRGB transfer functions is lossless, so the final
//   on-screen value is exactly 1.0 - original sRGB value
//   (0x336699 -> 0xcc9966, white sphere -> black).

const InvertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    // Exact piecewise sRGB transfer functions (same math Three.js uses),
    // so linear <-> sRGB round-trips are exact.
    vec3 linearToSRGB(vec3 value) {
      vec3 lt = vec3(lessThanEqual(value, vec3(0.0031308)));
      vec3 hi = vec3(1.055) * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - vec3(0.055);
      vec3 lo = value * vec3(12.92);
      return mix(hi, lo, lt);
    }

    vec3 sRGBToLinear(vec3 value) {
      vec3 lt = vec3(lessThanEqual(value, vec3(0.04045)));
      vec3 hi = pow(max((value + vec3(0.055)) / vec3(1.055), vec3(0.0)), vec3(2.4));
      vec3 lo = value / vec3(12.92);
      return mix(hi, lo, lt);
    }

    void main() {
      // tDiffuse is in LINEAR space.
      vec3 linearColor = texture2D(tDiffuse, vUv).rgb;

      // Convert to sRGB so the inversion matches what would be on screen
      // without the effect.
      vec3 srgbColor = linearToSRGB(linearColor);

      // Exact sRGB-space inversion.
      vec3 invertedSrgb = vec3(1.0) - srgbColor;

      // Convert back to LINEAR so OutputPass's final linear -> sRGB
      // conversion reproduces exactly invertedSrgb on screen.
      gl_FragColor = vec4(sRGBToLinear(invertedSrgb), 1.0);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);
composer.addPass(new OutputPass());

// ---------- Resize ----------
function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}
window.addEventListener('resize', onResize);

// ---------- Expose for testing ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// ---------- Render loop ----------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Example of time-based motion hooks (nothing moves in this scene,
  // but timing is delta/elapsed based per requirements).
  void delta;
  void elapsed;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
