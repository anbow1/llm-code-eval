```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphereGeometry = new THREE.SphereGeometry(1, 48, 48);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Post-processing: RenderPass -> OutputPass -> Invert ShaderPass
// Order matters: OutputPass converts linear->sRGB first, so the inversion
// operates in sRGB space, giving the exact per-channel inverse of the
// final displayed color.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const invertShader: {
  uniforms: { tDiffuse: { value: THREE.Texture | null } };
  vertexShader: string;
  fragmentShader: string;
} = {
  uniforms: {
    tDiffuse: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      texel.rgb = 1.0 - texel.rgb;
      gl_FragColor = texel;
    }
  `,
};

const invertPass = new ShaderPass(invertShader);
composer.addPass(invertPass);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Resize handling
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// Animation loop
const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const _delta = clock.getDelta();
  composer.render();
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```