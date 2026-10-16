

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x336699);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 4);
camera.lookAt(0, 0, 0);

// Sphere
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Custom inversion shader (operates in linear space, converts to sRGB, inverts, converts back)
const InversionShader: {
  uniforms: { tDiffuse: { value: THREE.Texture | null } };
  vertexShader: string;
  fragmentShader: string;
} = {
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
      // Convert linear -> sRGB
      vec3 srgb = linearToSrgb(texColor.rgb);
      // Invert in sRGB space
      vec3 inverted = 1.0 - srgb;
      // Convert back to linear so OutputPass can do the final linear->sRGB
      vec3 result = srgbToLinear(inverted);
      gl_FragColor = vec4(result, texColor.a);
    }
  `,
};

// Post-processing pipeline
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(InversionShader));
composer.addPass(new OutputPass());

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__composer = composer;

// Resize handling
function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Animation loop
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // Animate sphere rotation using delta time
  sphere.rotation.y += delta * 0.5;
  sphere.rotation.x += delta * 0.3;

  composer.render();

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```