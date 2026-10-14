```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Sphere
const sphereGeom = new THREE.SphereGeometry(1, 64, 32);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeom, sphereMat);
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

// Custom inversion shader – operates in sRGB space so the visual result
// is the exact per-channel complement of what the screen would show.
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

    float linearToSRGB(float c) {
      return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
    }

    float sRGBToLinear(float c) {
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // RenderPass outputs linear-space colours.
      // Convert linear -> sRGB, invert in sRGB, then back to linear
      // so that OutputPass (linear -> sRGB for display) yields
      // the exact sRGB complement of the original.
      vec3 srgb = vec3(
        linearToSRGB(texel.r),
        linearToSRGB(texel.g),
        linearToSRGB(texel.b)
      );

      vec3 inverted = 1.0 - srgb;

      vec3 result = vec3(
        sRGBToLinear(inverted.r),
        sRGBToLinear(inverted.g),
        sRGBToLinear(inverted.b)
      );

      gl_FragColor = vec4(result, texel.a);
    }
  `,
};

// Composer pipeline: RenderPass → InvertShaderPass → OutputPass
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const invertPass = new ShaderPass(InvertShader);
composer.addPass(invertPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Resize handler
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// Render loop
let firstFrameDone = false;
renderer.setAnimationLoop(() => {
  composer.render();
  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});
```