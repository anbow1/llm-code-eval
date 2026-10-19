```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Scene / camera / object
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

// ---------------------------------------------------------------------------
// Color-inversion shader
// ---------------------------------------------------------------------------
// IMPORTANT ORDERING NOTE:
// The RenderPass renders into a linear-sRGB float render target, so no
// linear -> sRGB conversion has happened yet at that point. OutputPass is
// what performs the final linear -> sRGB conversion (plus tone mapping).
// To make the on-screen result the EXACT inverse of the un-effect screen
// (0x336699 -> 0xcc9966, white -> black), we must invert in the sRGB
// (display) space, i.e. AFTER the OutputPass. Inverting the linear values
// instead would produce a different (wrong) color after conversion.
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
      // tDiffuse here is already in display (sRGB) space because it comes
      // after OutputPass, so a simple per-channel inversion is exact.
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `
};

// ---------------------------------------------------------------------------
// Post-processing chain: Render -> Output (linear->sRGB) -> Invert (sRGB)
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

// ---------------------------------------------------------------------------
// Resize handling
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
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // A bit of motion driven by elapsed time (does not affect the flat colors).
  sphere.rotation.y = elapsed * 0.5;
  sphere.position.y = Math.sin(elapsed) * 0.1;

  composer.render(delta);

  if (!firstFrameDone) {
    firstFrameDone = true;
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