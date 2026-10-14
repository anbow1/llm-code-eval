```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Scene / camera
// ---------------------------------------------------------------------------
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
  new THREE.SphereGeometry(1, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Post-processing
//
// Color-space reasoning:
// - EffectComposer's internal buffers are LINEAR. RenderPass therefore writes
//   linear-encoded colors into the chain (background 0x336699 becomes
//   srgb->linear of (0.2, 0.4, 0.6), the sphere stays 1.0).
// - OutputPass performs the final linear -> sRGB conversion for the screen.
// - Naively inverting in linear space would be WRONG: invert-then-encode is
//   not encode-then-invert (sRGB transfer is non-linear).
// - Correct result (screen shows 1 - sRGB(linear)) requires inverting AFTER
//   the sRGB transfer function. To keep OutputPass as the last pass doing the
//   canonical linear->sRGB conversion, this shader:
//      1. decodes the incoming linear texel to sRGB,
//      2. inverts it (1 - c) in sRGB space,
//      3. re-encodes sRGB -> linear and outputs that.
//   OutputPass then encodes linear -> sRGB, which restores exactly
//   "1 - sRGB(linear)" per channel on screen: background appears as 0xcc9966,
//   the white sphere as black.
// ---------------------------------------------------------------------------
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

    // sRGB piecewise transfer functions (accurate, not the 2.2 approximation).
    vec3 linearToSRGB(vec3 c) {
      c = clamp(c, 0.0, 1.0);
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 sRGBToLinear(vec3 c) {
      c = clamp(c, 0.0, 1.0);
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 srgb   = linearToSRGB(texel.rgb);   // decode to display space
      vec3 invert = 1.0 - srgb;                // invert in display space
      gl_FragColor = vec4(sRGBToLinear(invert), texel.a); // back to linear
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InvertShader));
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = clock.getDelta();

  // Subtle motion driven by elapsed time (frame-count independent).
  sphere.rotation.y = time * 0.0003;

  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```