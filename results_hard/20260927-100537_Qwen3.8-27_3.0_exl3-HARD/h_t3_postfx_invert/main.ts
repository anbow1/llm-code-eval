import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Custom color-inversion shader (operates in sRGB domain for exact inversion)
const InversionShader = {
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
    varying vec2 vUv;
    uniform sampler2D tDiffuse;

    vec3 linearToSrgb(vec3 c) {
      vec3 low = c * 12.92;
      vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(low, high, step(0.0031308, c));
    }

    vec3 srgbToLinear(vec3 c) {
      vec3 low = c / 12.92;
      vec3 high = pow(max((c + 0.055) / 1.055, vec3(0.0)), vec3(2.4));
      return mix(low, high, step(0.04045, c));
    }

    void main() {
      vec4 texColor = texture2D(tDiffuse, vUv);
      // Render target holds linear-space colors.
      // Convert to sRGB, invert, then convert back to linear
      // so that OutputPass (linear -> sRGB) yields the exact sRGB inverse.
      vec3 srgb = linearToSrgb(texColor.rgb);
      vec3 invertedSrgb = 1.0 - srgb;
      vec3 result = srgbToLinear(invertedSrgb);
      gl_FragColor = vec4(result, texColor.a);
    }
  `,
};

const inversionPass = new ShaderPass(InversionShader);
composer.addPass(inversionPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Render loop
let firstFrame = true;
renderer.setAnimationLoop(() => {
  composer.render();
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
