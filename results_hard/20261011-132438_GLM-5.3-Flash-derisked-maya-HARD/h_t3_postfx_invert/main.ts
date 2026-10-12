import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene / camera / object ----------------------------------------------

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

// --- Renderer --------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Custom invert shader --------------------------------------------------
//
// Color-space reasoning:
//  - The RenderPass writes linear-space colors into the composer's
//    HalfFloat render targets (the composer's buffers are always linear;
//    scene.background / material colors are converted sRGB -> linear on
//    their way in).
//  - OutputPass performs the linear -> sRGB conversion that would normally
//    happen when writing to the (sRGB) canvas.
//  - Therefore the inversion pass must run AFTER the OutputPass: at that
//    point the buffer already holds sRGB-encoded values, and inverting them
//    per channel gives the exact sRGB inverse on screen
//    (0x336699 -> 0xcc9966, 0xffffff -> 0x000000). Running the inversion
//    before the OutputPass would invert in linear space, which is NOT the
//    per-channel sRGB inverse.

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
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Input is sRGB-encoded (OutputPass already converted linear -> sRGB),
      // so a plain per-channel inversion is the exact sRGB inverse.
      gl_FragColor = vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, color.a);
    }
  `
};

// --- Post-processing chain --------------------------------------------------

const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass()); // linear -> sRGB happens here
composer.addPass(new ShaderPass(InvertShader)); // then invert in sRGB space

// --- Resize -----------------------------------------------------------------

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// --- Expose for testing ------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// --- Render loop -------------------------------------------------------------

let firstFrameDone = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  void delta; // delta-driven updates would go here

  composer.render();

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
