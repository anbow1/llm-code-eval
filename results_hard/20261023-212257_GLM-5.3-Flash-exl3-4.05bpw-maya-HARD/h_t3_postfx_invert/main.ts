import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------
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

const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// ---------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------
// Custom inversion ShaderPass.
//
// Color-space reasoning:
//  - The EffectComposer render targets hold LINEAR values.
//  - The OutputPass (placed last) performs the linear -> sRGB
//    conversion for display.
//  - To get the EXACT sRGB inverse on screen, the inversion must
//    happen in sRGB space, not linear space. So this shader:
//      1. converts the sampled linear color to sRGB,
//      2. inverts it (1.0 - rgb),
//      3. converts back to linear,
//    so that OutputPass' final linear -> sRGB conversion restores
//    the inverted sRGB value exactly.
//  => background 0x336699 appears as 0xcc9966, white sphere -> black.
// ---------------------------------------------------------------
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

    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 srgbToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow(max((c + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      // Convert linear -> sRGB, invert there, convert back to linear.
      vec3 srgb = clamp(linearToSRGB(texel.rgb), 0.0, 1.0);
      vec3 inverted = 1.0 - srgb;
      gl_FragColor = vec4(srgbToLinear(inverted), texel.a);
    }
  `
};

// ---------------------------------------------------------------
// Post-processing chain: Render -> Invert (sRGB-aware) -> Output
// ---------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// ---------------------------------------------------------------
// Resize handling: camera, renderer AND composer
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ---------------------------------------------------------------
// Render loop (delta-time based motion, composer.render())
// ---------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Some delta-time driven motion so the loop is time-based.
  sphere.rotation.y += delta * 0.5;
  sphere.rotation.x += delta * 0.2;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
