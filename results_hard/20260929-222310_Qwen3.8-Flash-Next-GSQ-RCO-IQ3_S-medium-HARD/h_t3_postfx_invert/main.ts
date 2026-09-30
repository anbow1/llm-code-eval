import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
sphere.position.set(0, 0, 0);
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

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Custom inversion shader (inverts in sRGB space) ---
const InvertShader = {
  name: 'InvertShader',
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

    vec3 sRGBToLinear(vec3 srgb) {
      return mix(
        srgb / 12.92,
        pow((srgb + vec3(0.055)) / 1.055, vec3(2.4)),
        step(vec3(0.04045), srgb)
      );
    }

    vec3 linearToSRGB(vec3 lin) {
      return mix(
        lin * 12.92,
        1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055,
        step(vec3(0.0031308), lin)
      );
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Render target is linear. Convert to sRGB, invert, convert back to linear.
      vec3 srgb = linearToSRGB(texel.rgb);
      vec3 invertedSrgb = 1.0 - srgb;
      vec3 invertedLinear = sRGBToLinear(invertedSrgb);

      gl_FragColor = vec4(invertedLinear, texel.a);
    }
  `,
};

// --- Composer ---
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
