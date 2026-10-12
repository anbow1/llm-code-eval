import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699); // stored as LINEAR (color-managed)

const sphereGeometry = new THREE.SphereGeometry(1, 64, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // default, but explicit
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Post-processing
//
// The composer's internal render targets are LINEAR (HalfFloat, NoColorSpace).
// RenderPass fills them with linear values. The final on-screen color without
// any effect would be sRGB-encode(linear), applied by OutputPass at the end.
//
// To make the screen show the EXACT inverse of that, we must invert in sRGB
// space, not in linear space (inverting linear values then encoding would
// produce a different, wrong color).
//
// Strategy: our custom pass sits BEFORE OutputPass. It:
//   1. reads the linear color,
//   2. converts it to sRGB (the same OETF OutputPass will apply),
//   3. inverts it (1.0 - srgb),
//   4. converts back to linear (exact inverse of step 2, lossless in float).
// OutputPass then re-applies the sRGB OETF on its way to the screen, so the
// net on-screen result is exactly 1.0 - srgb(linearSourceColor).
// Background 0x336699 -> on screen 0xcc9966; white sphere -> black.
// ---------------------------------------------------------------------------
const InvertInSRGBShader = {
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

    // Linear -> sRGB (IEC 61966-2-1 OETF), matching Three's OutputPass.
    vec3 linearToSRGB(vec3 color) {
      vec3 low = color * 12.92;
      vec3 high = 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055;
      return mix(low, high, step(vec3(0.0031308), color));
    }

    // sRGB -> Linear (exact inverse of the OETF above).
    vec3 sRGBToLinear(vec3 color) {
      vec3 low = color / 12.92;
      vec3 high = pow((color + 0.055) / 1.055, vec3(2.4));
      return mix(low, high, step(vec3(0.04045), color));
    }

    void main() {
      vec3 linearColor = texture2D(tDiffuse, vUv).rgb;

      // Go to sRGB space, invert there, and come back to linear so that the
      // downstream OutputPass OETF restores the inverted sRGB value verbatim.
      vec3 srgbColor = linearToSRGB(linearColor);
      vec3 invertedSRGB = 1.0 - srgbColor;
      gl_FragColor = vec4(sRGBToLinear(invertedSRGB), 1.0);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InvertInSRGBShader, 'tDiffuse'));
composer.addPass(new OutputPass()); // last pass: renders to screen with sRGB OETF

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  // Time-based motion (delta, not frame counts).
  sphere.rotation.y += delta * 0.6;
  sphere.rotation.x += delta * 0.3;

  composer.render(delta);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// ---------------------------------------------------------------------------
// Resize handling: camera, renderer, and composer
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
