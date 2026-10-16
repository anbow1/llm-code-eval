import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer();
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Composer: RenderPass → OutputPass → InvertShaderPass ---
// Pipeline order rationale:
//   1. RenderPass writes linear-space colors into the float render target.
//   2. OutputPass converts linear → sRGB (the gamma curve).
//   3. InvertShaderPass inverts the already-sRGB values, so the on-screen
//      result is exactly 1.0 - (original sRGB), which is the true perceptual
//      complement.  Placing the inversion *after* the sRGB conversion is what
//      makes 0x336699 → 0xCC9966 and 0xffffff → 0x000000 hold exactly.
//
// renderer.outputColorSpace = LinearSRGBColorSpace prevents the GPU from
// applying a second sRGB transfer function when the final pass blits to the
// default framebuffer (the data is already in sRGB at that point).

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const invertPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
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
  `,
});
composer.addPass(invertPass);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
let ready = false;
renderer.setAnimationLoop(() => {
  composer.render();
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
