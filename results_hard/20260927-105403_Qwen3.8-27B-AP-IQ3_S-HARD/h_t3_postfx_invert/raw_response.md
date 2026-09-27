```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeo, sphereMat);
scene.add(sphere);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Post-processing ---
const composer = new EffectComposer(renderer);

// 1) RenderPass: renders the scene into the buffer (linear color space)
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2) OutputPass: applies tone mapping + linear → sRGB conversion
//    After this pass the buffer holds final display (sRGB) colors.
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 3) Custom ShaderPass: inverts the sRGB colors on screen.
//    Because it runs AFTER OutputPass, the inversion operates in sRGB space,
//    which is exactly what we need: 0x336699 → 0xcc9966, 0xffffff → 0x000000.
const invertShader = {
  uniforms: {
    tDiffuse: { value: null }
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
      color.rgb = 1.0 - color.rgb;
      gl_FragColor = color;
    }
  `
};
const invertPass = new ShaderPass(invertShader);
invertPass.renderToScreen = true;
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

// --- Render loop ---
let firstFrame = true;
renderer.setAnimationLoop((_time: number) => {
  composer.render();
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```