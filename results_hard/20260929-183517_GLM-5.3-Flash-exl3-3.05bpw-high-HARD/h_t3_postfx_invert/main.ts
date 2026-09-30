import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ------------------------------------------------------------------
// Renderer / Scene / Camera
// ------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

// ------------------------------------------------------------------
// Scene content
// ------------------------------------------------------------------

const sphereGeometry = new THREE.SphereGeometry(1, 48, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// ------------------------------------------------------------------
// Post-processing
//
// Color-space reasoning:
//
// In r152+ three.js, hex colors set on materials / backgrounds are
// converted from sRGB to *linear-sRGB* internally. EffectComposer's
// internal render targets are linear (HalfFloatType), and the
// linear -> sRGB conversion normally happens at the very end,
// inside OutputPass.
//
// So if we inverted between RenderPass and OutputPass we would
// invert *linear* values:  1 - linear != sRGB(1 - sRGB(linear)),
// and the screen colors would NOT be exact inverses.
//
// Correct ordering: RenderPass -> OutputPass -> InvertPass.
//   - OutputPass writes sRGB-encoded values into the composer's
//     intermediate target (the raw values the screen would have
//     shown without the effect).
//   - InvertPass then computes 1 - sRGB, which is exactly the
//     inverse of the on-screen color, and (as the last pass)
//     writes directly to the canvas with no further conversion.
//
// Result: background 0x336699 -> 0xcc9966 on screen, white sphere -> black.
// ------------------------------------------------------------------

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
      // Input is already sRGB-encoded (OutputPass ran before this pass),
      // so a plain component-wise inversion gives the exact inverse of
      // what the screen would display.
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(window.innerWidth, window.innerHeight);

composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass); // last pass -> renders to screen

// ------------------------------------------------------------------
// Resize
// ------------------------------------------------------------------

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ------------------------------------------------------------------
// Expose for testing
// ------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// ------------------------------------------------------------------
// Animation loop
// ------------------------------------------------------------------

const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Time-based motion (delta-driven, not frame-count-driven).
  sphere.rotation.y += delta * 0.5;
  sphere.position.x = Math.sin(elapsed * 0.8) * 0.15;

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
