```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
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

// --- Custom Inversion Shader ---
// The render target is in LINEAR color space.
// To get correct sRGB inversion on screen:
//   1. Convert incoming linear value to sRGB
//   2. Invert in sRGB space (1.0 - srgb)
//   3. Convert back to linear so OutputPass can do its linear→sRGB correctly
// Net result on screen: 1.0 - original_srgb  (exact sRGB inversion)

const InvertShader = {
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

    vec3 linearToSRGB(vec3 color) {
      return mix(
        color * 12.92,
        1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
        step(vec3(0.0031308), color)
      );
    }

    vec3 sRGBToLinear(vec3 color) {
      return mix(
        color / 12.92,
        pow((color + 0.055) / 1.055, vec3(2.4)),
        step(vec3(0.04045), color)
      );
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Convert from linear (render target) to sRGB
      vec3 srgb = linearToSRGB(texel.rgb);

      // Invert in sRGB space
      vec3 inverted_srgb = 1.0 - srgb;

      // Convert back to linear so OutputPass converts linear→sRGB correctly
      vec3 inverted_linear = sRGBToLinear(inverted_srgb);

      gl_FragColor = vec4(inverted_linear, texel.a);
    }
  `,
};

// --- Effect Composer ---
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Animation loop ---
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta(); // keep delta available for any animation
  void delta; // currently static scene, but timing infrastructure is in place

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// --- Resize handler ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
```