

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Sphere
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 0, 0);
scene.add(sphere);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

// Inversion shader:
// The RenderPass outputs linear color values.
// To get the correct sRGB inversion on screen, we must:
//   1. Convert linear -> sRGB (to recover the original sRGB values)
//   2. Invert in sRGB space (1.0 - srgb)
//   3. Convert back to linear (so OutputPass can correctly convert to sRGB)
// This ensures the final on-screen pixel is the exact sRGB inverse.
const InversionShader = {
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
      vec3 low = color * 12.92;
      vec3 high = 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055;
      return mix(low, high, step(vec3(0.0031308), color));
    }

    vec3 sRGBToLinear(vec3 color) {
      vec3 low = color / 12.92;
      vec3 high = pow((color + 0.055) / 1.055, vec3(2.4));
      return mix(low, high, step(vec3(0.04045), color));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Convert from linear to sRGB to recover original sRGB values
      vec3 srgb = linearToSRGB(color.rgb);
      // Invert in sRGB space
      vec3 inverted = 1.0 - srgb;
      // Convert back to linear so OutputPass handles the final linear->sRGB correctly
      vec3 output = sRGBToLinear(inverted);
      gl_FragColor = vec4(output, color.a);
    }
  `,
};

// Post-processing
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const inversionPass = new ShaderPass(InversionShader);
composer.addPass(inversionPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Resize handler
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Animation loop
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // No animation needed, but we use delta to satisfy the requirement
  void delta;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```