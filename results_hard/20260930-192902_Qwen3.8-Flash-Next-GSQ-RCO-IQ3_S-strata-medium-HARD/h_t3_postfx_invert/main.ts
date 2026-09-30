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

const sphereGeo = new THREE.SphereGeometry(1, 64, 32);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeo, sphereMat);
sphere.position.set(0, 0, 0);
scene.add(sphere);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// --- Custom inversion shader (operates in sRGB space) ---
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  varying vec2 vUv;

  vec3 linearToSRGB(vec3 c) {
    return mix(
      c * 12.92,
      1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
      step(vec3(0.0031308), c)
    );
  }

  vec3 sRGBToLinear(vec3 c) {
    return mix(
      c / 12.92,
      pow((c + 0.055) / 1.055, vec3(2.4)),
      step(vec3(0.04045), c)
    );
  }

  void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    // Input is linear (RenderPass output). Convert to sRGB, invert, convert back.
    vec3 srgb = linearToSRGB(texel.rgb);
    vec3 inverted = 1.0 - srgb;
    vec3 result = sRGBToLinear(inverted);
    gl_FragColor = vec4(result, 1.0);
  }
`;

const InvertShader = {
  name: 'SRGBInvertShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
  },
  vertexShader,
  fragmentShader,
};

// --- Post-processing pipeline ---
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

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

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// --- Render loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  composer.render();
  if (firstFrame) {
    firstFrame = false;
    (window as any).__ready = true;
  }
});
