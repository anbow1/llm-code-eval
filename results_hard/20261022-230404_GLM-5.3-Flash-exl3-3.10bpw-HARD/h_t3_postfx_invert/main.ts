import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Renderer ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene / Camera ----------------------------------------------------------
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

// --- Geometry ----------------------------------------------------------------
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// --- Post-processing ---------------------------------------------------------
// Pass order matters for an *exact* on-screen inversion:
// 1. RenderPass  -> renders the scene in LINEAR color space into the composer's
//                  internal (HalfFloat) render target.
// 2. OutputPass  -> performs the linear -> sRGB conversion (what would actually
//                  appear on screen without any effect).
// 3. InvertPass  -> operates AFTER the sRGB conversion, so it inverts the exact
//                  sRGB-encoded values that would have been shown:
//                  displayed = 1 - displayedWithoutEffect.
//                  background 0x336699 -> 0xcc9966, white sphere -> black.
//
// If we inverted in linear space (before OutputPass), the subsequent linear ->
// sRGB transfer function would break the exact 1-x relationship in the final
// sRGB display values.

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
      // Input here is already sRGB-encoded (OutputPass ran before this pass),
      // so a straight component-wise inversion is exact on screen.
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
composer.setPixelRatio(window.devicePixelRatio);

composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass); // last pass renders to screen automatically

// --- Expose for testing -------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// --- Resize -------------------------------------------------------------------
function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}
window.addEventListener('resize', onResize);

// --- Animation loop ------------------------------------------------------------
let firstFrameDone = false;

renderer.setAnimationLoop((/* time */) => {
  const delta = renderer.getDelta?.() ?? 0;
  void delta; // delta-time based motion would go here; the sphere is static

  composer.render();

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
