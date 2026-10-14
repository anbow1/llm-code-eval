```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Renderer ----------------------------------------------------------------
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // default, kept explicit
document.body.appendChild(renderer.domElement);

// --- Scene -------------------------------------------------------------------
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
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(sphere);

// --- Post-processing ----------------------------------------------------------
// Key idea about color spaces:
// - The RenderPass renders the scene into the composer's linear working buffers,
//   so 0x336699 is stored as its *linear* value there.
// - The OutputPass performs the linear -> sRGB conversion. If we inverted the
//   linear values and let the OutputPass convert afterwards, the on-screen
//   result would NOT be the inverse of the sRGB colors.
// - Therefore we place the OutputPass BEFORE the inversion shader: the shader
//   then receives already-encoded sRGB values and simply outputs 1.0 - rgb,
//   writing straight to the canvas (the last pass renders to screen and no
//   further conversion is applied to a ShaderMaterial output).
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
const outputPass = new OutputPass();

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
      // Input is sRGB-encoded (OutputPass already converted linear -> sRGB).
      // Inverting here inverts the exact values shown on screen.
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

const invertPass = new ShaderPass(InvertShader);

composer.addPass(renderPass);
composer.addPass(outputPass);
composer.addPass(invertPass); // last pass -> composer renders it to screen

// --- Test hooks ---------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// --- Resize -------------------------------------------------------------------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// --- Render loop ----------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  composer.render(clock.getDelta());
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```