```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Geometry: white sphere at origin ---
const sphereGeometry = new THREE.SphereGeometry(1, 48, 48);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Post-processing pipeline ---
// Order matters for correct color-space handling:
//   1. RenderPass   → writes scene in *linear* working color space
//   2. OutputPass   → converts linear → sRGB (tone-map + gamma)
//   3. InvertPass   → inverts the *sRGB* values (1.0 - rgb), which is
//                      exactly the perceptual inversion we need on screen.
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const invertShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
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
      // Invert in sRGB space (already converted by OutputPass)
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `,
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// --- Resize handling ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// --- Animation loop (delta-based) ---
const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Subtle rotation to demonstrate delta-based motion
  sphere.rotation.y += 0.3 * delta;
  sphere.rotation.x += 0.1 * delta;

  composer.render();

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});
```