import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Mesh ---
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
sphere.position.set(0, 0, 0);
scene.add(sphere);

// --- Custom Inversion Shader (operates in sRGB space) ---
const InvertShader = {
  name: 'InvertSRGBShader',
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
      vec3 result;
      for (int i = 0; i < 3; i++) {
        if (color[i] <= 0.0031308) {
          result[i] = color[i] * 12.92;
        } else {
          result[i] = 1.055 * pow(color[i], 1.0 / 2.4) - 0.055;
        }
      }
      return result;
    }

    vec3 sRGBToLinear(vec3 srgb) {
      vec3 result;
      for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
          result[i] = srgb[i] / 12.92;
        } else {
          result[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
      }
      return result;
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      // Work in sRGB space so the inversion matches perceptual / display expectation:
      // 1. Convert linear render-target value -> sRGB
      // 2. Invert in sRGB
      // 3. Convert back to linear for OutputPass to do the final linear->sRGB
      vec3 srgb = linearToSRGB(texel.rgb);
      srgb = vec3(1.0) - srgb;
      vec3 linear = sRGBToLinear(srgb);
      gl_FragColor = vec4(linear, texel.a);
    }
  `,
};

// --- Post-processing pipeline ---
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Resize ---
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
const clock = new THREE.Clock();

function animate(): void {
  const _elapsed = clock.getElapsedTime();

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
}

renderer.setAnimationLoop(animate);

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;
