import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

// --- Post-processing ---
const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  type: THREE.HalfFloatType,
});

const composer = new EffectComposer(renderer, renderTarget);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Custom invert shader that operates in sRGB space
const InvertShader = {
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

    vec3 linearToSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
      return mix(hi, lo, step(c, vec3(0.0031308)));
    }

    vec3 sRGBToLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(hi, lo, step(c, vec3(0.04045)));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      // Convert from linear (render target) to sRGB
      vec3 srgb = linearToSRGB(texel.rgb);
      // Invert in sRGB space so the final on-screen result is 1-sRGB(original)
      vec3 invertedSrgb = 1.0 - srgb;
      // Convert back to linear so OutputPass can do linear->sRGB for display
      vec3 linearOut = sRGBToLinear(invertedSrgb);
      gl_FragColor = vec4(linearOut, texel.a);
    }
  `,
};

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Resize handler ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// --- Animation loop ---
let firstFrame = true;
renderer.setAnimationLoop(() => {
  composer.render();
  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
