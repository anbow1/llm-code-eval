```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
sphere.position.set(0, 0, 0);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Post-processing pipeline ---
// Order: RenderPass → OutputPass → InversionPass
//
// Explanation of color-space correctness:
//  • RenderPass renders the scene into a HalfFloat render target in LINEAR space.
//  • OutputPass converts linear → sRGB and stores sRGB-encoded floats in the
//    intermediate render target (it does NOT need to be the last pass – the
//    sRGB conversion is baked into its shader via a #define).
//  • InversionPass reads those sRGB-encoded values, inverts each channel
//    (1.0 − rgb) and writes the result directly to the screen framebuffer.
//    Because the inversion happens in sRGB space, the on-screen pixel values
//    are the exact arithmetic inverse of the un-post-processed pixels:
//      0x336699 → 0xCC9966,  white → black.

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Custom inversion ShaderPass (must come AFTER OutputPass so it operates in sRGB)
const InversionShader = {
  name: 'InversionShader',
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
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Invert in sRGB space (values in tDiffuse are already sRGB-encoded
      // because OutputPass ran before this pass).
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `,
};

const inversionPass = new ShaderPass(InversionShader);
composer.addPass(inversionPass);

// --- Resize handling ---
function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// --- Animation loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```