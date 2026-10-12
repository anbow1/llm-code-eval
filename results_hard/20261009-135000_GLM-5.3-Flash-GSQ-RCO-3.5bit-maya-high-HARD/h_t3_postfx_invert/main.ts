import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Color-space reasoning:
// The scene is rendered in LINEAR space. Without post-processing, the renderer
// (or OutputPass) converts linear -> sRGB right before hitting the screen.
// To get the EXACT inverse of the on-screen sRGB colors (0x336699 -> 0xcc9966,
// white -> black), the inversion must happen AFTER that linear -> sRGB
// conversion. Therefore the pass order is:
//   RenderPass (linear) -> OutputPass (linear -> sRGB encoding) -> ShaderPass (invert, to screen)
// The invert pass reads sRGB-encoded values from the composer buffer, inverts
// them, and writes them raw to the canvas (ShaderMaterial does no conversion),
// so the screen shows exactly 1 - sRGB(linear) per channel.

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
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene / Camera ---
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

// --- Post-processing ---
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// OutputPass performs the linear -> sRGB conversion first.
const outputPass = new OutputPass();
composer.addPass(outputPass);

// The invert ShaderPass runs last (renderToScreen), operating on
// sRGB-encoded values, guaranteeing an exact on-screen color inverse.
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

// --- Resize ---
function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}
window.addEventListener('resize', onResize);

// --- Testing hooks ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop(() => {
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
