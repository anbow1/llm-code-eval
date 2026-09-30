import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Color-inversion post-processing with correct color-space handling.
 *
 * Pipeline: RenderPass -> OutputPass -> InvertShaderPass
 *
 * Why this order:
 * - The RenderPass draws the scene into a linear-space HDR buffer
 *   (scene colors are converted from sRGB to linear-linear working space).
 * - The OutputPass performs the linear -> sRGB (display) conversion.
 * - The invert pass runs AFTER that conversion, i.e. it inverts the
 *   display-referred sRGB values (rgb -> 1.0 - rgb). Inverting in sRGB space
 *   is what produces the exact complement of what would appear on screen:
 *   background 0x336699 -> 0xcc9966, white sphere -> black.
 *   (Inverting in linear working space instead would give a different,
 *   physically-shifted result because the sRGB transfer function is not
 *   affine.)
 *
 * The final ShaderPass writes raw values straight to the canvas, so the
 * sRGB-encoded numbers coming out of the invert pass end up as the exact
 * on-screen colors.
 */

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
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

// ---------------------------------------------------------------------------
// Scene content: one white sphere at the origin
// ---------------------------------------------------------------------------

const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------

const composer = new EffectComposer(renderer);

// 1. Render the scene (colors are in linear working space at this point).
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2. Convert linear -> sRGB (display space). This is the stage where the
//    transfer function is applied, and it works even when writing to the
//    composer's intermediate buffer rather than the screen.
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 3. Invert in display (sRGB) space: out = 1.0 - in.
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
      vec4 texel = texture2D(tDiffuse, vUv);
      // Exact display-space color complement.
      gl_FragColor = vec4(1.0 - texel.rgb, texel.a);
    }
  `
};

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

// ---------------------------------------------------------------------------
// Render loop (time-based)
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Delta/time-driven motion (a slow spin; visually neutral on a flat
  // basic-material sphere but keeps everything frame-rate independent).
  sphere.rotation.y = elapsed * 0.5;
  sphere.rotation.x += delta * 0.1;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

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
// Test hooks
// ---------------------------------------------------------------------------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
