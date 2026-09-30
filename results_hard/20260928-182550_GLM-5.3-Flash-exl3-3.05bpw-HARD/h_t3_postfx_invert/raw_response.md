```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Custom inversion shader.
//
// The chain works like this:
//   1. RenderPass renders the scene into a linear-space render target
//      (no output conversion happens when rendering to an RT).
//   2. Our shader converts linear -> sRGB, inverts (1.0 - sRGB), and converts
//      sRGB -> linear again, so the buffer once more holds linear values
//      whose sRGB encoding is the exact inverse of the original.
//   3. OutputPass performs the final linear -> sRGB transfer to the canvas.
//
// Result: screen color = 1.0 - sRGB(scene color), i.e. 0x336699 -> 0xcc9966
// and white -> black, byte-exact.
// ---------------------------------------------------------------------------
const InvertColorsShader: object = {
  name: 'InvertColorsShader',

  uniforms: {
    tDiffuse: { value: null },
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

    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 srgbToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // The buffer holds linear values. Encode to sRGB, invert there,
      // then re-encode back to linear so OutputPass can do the final
      // linear -> sRGB conversion exactly once.
      vec3 linear = clamp(texel.rgb, 0.0, 1.0);
      vec3 srgb = linearToSRGB(linear);
      vec3 inverted = 1.0 - srgb;

      gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
    }
  `,
};

// ---------------------------------------------------------------------------
// Scene setup
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
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
const invertPass = new ShaderPass(InvertColorsShader);
const outputPass = new OutputPass();

composer.addPass(renderPass);
composer.addPass(invertPass);
composer.addPass(outputPass);

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Expose for testing
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```