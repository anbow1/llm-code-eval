```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sphere
const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeo, sphereMat);
scene.add(sphere);

// --- Custom inversion shader (operates in sRGB space, outputs linear for OutputPass) ---
const InvertShader: { uniforms: { [k: string]: THREE.IUniform }; vertexShader: string; fragmentShader: string } = {
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

    // Exact sRGB transfer functions
    vec3 linearToSRGB(vec3 c) {
      vec3 powed = pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055;
      vec3 linear = c * 12.92;
      return mix(powed, linear, step(c, vec3(0.0031308)));
    }

    vec3 sRGBToLinear(vec3 c) {
      vec3 powed = pow((c + 0.055) / 1.055, vec3(2.4));
      vec3 linear = c / 12.92;
      return mix(powed, linear, step(c, vec3(0.04045)));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Convert from linear (render framebuffer) to sRGB
      vec3 srgb = linearToSRGB(color.rgb);
      // Invert in sRGB space
      vec3 inverted = 1.0 - srgb;
      // Convert back to linear so OutputPass can do linear->sRGB for display
      vec3 result = sRGBToLinear(inverted);
      gl_FragColor = vec4(result, color.a);
    }
  `,
};

// --- Post-processing pipeline ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

composer.addPass(new OutputPass());

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

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
    firstFrame = false;
    (window as any).__ready = true;
  }
});
```